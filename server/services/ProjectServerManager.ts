import { spawn, ChildProcess } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import net from 'net';

export interface ProjectInfo {
  process: ChildProcess | null;
  port: number;
  url: string;
  status: 'running' | 'starting' | 'stopped' | 'error';
  projectPath: string;
  stdout: string;
  stderr: string;
  npmInstallError: string | null;
  npmInstallExitCode: number | null;
  npmRunDevError: string | null;
  processExitCode: number | null;
  error: string | null;
}

class ProjectServerManager {
  private projects: Map<string, ProjectInfo> = new Map();
  private readonly projectsRoot = path.join(process.cwd(), 'projects');

  async getPackageManager(projectPath: string): Promise<{ manager: string; conflict: string | null }> {
    let preferredManager: string | null = null;
    let detectedManagers: string[] = [];
    let conflict: string | null = null;

    // 1. Check package.json "packageManager"
    try {
      const pkgJsonPath = path.join(projectPath, 'package.json');
      const pkgContent = await fs.readFile(pkgJsonPath, 'utf-8');
      const pkg = JSON.parse(pkgContent);
      if (pkg.packageManager) {
        const match = pkg.packageManager.match(/^(npm|pnpm|yarn)/);
        if (match) {
          preferredManager = match[1];
        }
      }
    } catch (e) {
      // package.json might not exist or be invalid
    }

    // 2. Check lockfiles
    try {
      const files = await fs.readdir(projectPath);
      if (files.includes('pnpm-lock.yaml')) {
        detectedManagers.push('pnpm');
      }
      if (files.includes('yarn.lock')) {
        detectedManagers.push('yarn');
      }
      if (files.includes('package-lock.json')) {
        detectedManagers.push('npm');
      }
      
      // 3. Check for .pnpm directory as a fallback/detection
      if (detectedManagers.length === 0) {
        const pnpmDir = path.join(projectPath, 'node_modules', '.pnpm');
        try {
          await fs.access(pnpmDir);
          detectedManagers.push('pnpm');
        } catch {
          // not pnpm
        }
      }
    } catch (e) {
      // error reading dir
    }

    // 4. Resolve
    if (detectedManagers.length > 1) {
      conflict = `Multiple lockfiles or package managers detected: ${detectedManagers.join(', ')}. Please clean up your project.`;
    } else if (preferredManager && detectedManagers.length > 0 && preferredManager !== detectedManagers[0]) {
      conflict = `Conflict: packageManager is ${preferredManager} but lockfile/structure suggests ${detectedManagers[0]}.`;
    }

    const manager = detectedManagers[0] || preferredManager || 'npm';
    return { manager, conflict };
  }

  async start(projectId: string): Promise<ProjectInfo> {
    if (this.projects.has(projectId)) {
      const existing = this.projects.get(projectId)!;
      if (existing.status === 'running' || existing.status === 'starting') {
        return existing;
      }
    }

    const projectPath = path.join(this.projectsRoot, projectId);
    
    try {
      await fs.mkdir(projectPath, { recursive: true });
    } catch (e) {
      console.error(`[PREVIEW] Failed to create directory ${projectPath}`, e);
    }

    const port = await this.findFreePort(5173);
    console.log('[PREVIEW-DEBUG] selected port', port);
    const url = `http://localhost:${port}`;

    const info: ProjectInfo = {
      process: null,
      port,
      url,
      status: 'starting',
      projectPath,
      stdout: '',
      stderr: '',
      npmInstallExitCode: null,
      npmInstallError: null,
      npmRunDevError: null,
      processExitCode: null,
      error: null,
    };

    this.projects.set(projectId, info);

    try {
      const { manager: pkgManager, conflict } = await this.getPackageManager(projectPath);
      if (conflict) {
        console.warn(`[PREVIEW] ${conflict}`);
      }

      const nodeModulesPath = path.join(projectPath, 'node_modules');
      let needsInstall = false;

      try {
        await fs.access(nodeModulesPath);
        
        // Check for incompatibility: e.g., npm chosen but pnpm structure exists
        if (pkgManager === 'npm') {
          const pnpmDir = path.join(projectPath, 'node_modules', '.pnpm');
          try {
            await fs.access(pnpmDir);
            console.warn('[PREVIEW] Detected pnpm structure in node_modules while npm is chosen. Marking for clean install.');
            needsInstall = true;
          } catch {
            // compatible npm structure
          }
        }
        
        // If a lockfile exists but doesn't match the manager, we should probably reinstall
        // This is covered by the fact that we prioritize the lockfile in getPackageManager.
        // If getPackageManager returns 'pnpm' because of pnpm-lock.yaml, and pkgManager is 'pnpm', we are good.
        // If pkgManager was 'npm' but pnpm-lock.yaml exists, conflict is reported and pkgManager is 'pnpm'.
        
      } catch {
        console.log(`[PREVIEW] node_modules not found, installing dependencies with ${pkgManager} in ${projectPath}...`);
        needsInstall = true;
      }

      // If conflict is too severe, we might want to stop. 
      // For now, we'll proceed but with the caution of the reported conflict.
      // But if we have multiple lockfiles, it's better to stop to avoid mess.
      if (conflict && conflict.includes('Multiple lockfiles')) {
          throw new Error(conflict);
      }

      if (needsInstall) {
        console.log(`[PREVIEW] Preparing fresh installation with ${pkgManager} in ${projectPath}...`);
        // Remove node_modules to ensure a clean state
        try {
          await fs.rm(nodeModulesPath, { recursive: true, force: true });
        } catch (err) {
          console.error(`[PREVIEW] Failed to remove existing node_modules:`, err);
          // If we can't remove it, we might still want to try installing, 
          // but it's risky. For now, let's try anyway.
        }

        console.log('[PREVIEW-DEBUG] install started');
        try {
          await this.runCommandWithOutput(pkgManager, ['install'], projectPath);
          info.npmInstallExitCode = 0;
          console.log('[PREVIEW-DEBUG] install exit code', 0);
        } catch (err: any) {
          info.npmInstallError = err.message;
          info.npmInstallExitCode = err.exitCode ?? -1;
          console.error('[PREVIEW-DEBUG] install error', err.message);
          throw err;
        }
      }

      console.log(`[PREVIEW] starting dev server with ${pkgManager} on port: ${port}`);
      console.log('[PREVIEW-DEBUG] projectId', projectId);
      console.log('[PREVIEW-DEBUG] projectPath', projectPath);
      console.log('[PREVIEW-DEBUG] dev server started');

      const devArgs = pkgManager === 'npm' || pkgManager === 'pnpm'
        ? ['run', 'dev', '--', '--port', port.toString(), '--host', '0.0.0.0']
        : ['run', 'dev', '--port', port.toString(), '--host', '0.0.0.0'];

      const child = spawn(pkgManager, devArgs, {
        cwd: projectPath,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      info.process = child;

      child.stdout?.on('data', (data) => {
        const output = data.toString();
        info.stdout += output;
        console.log(`[PREVIEW] [${projectId}] stdout: ${output.trim()}`);
        console.log('[PREVIEW-DEBUG] stdout', output.trim());
        if (output.includes('ready in') || output.includes('VITE v')) {
           info.status = 'running';
           console.log('[PREVIEW-DEBUG] server status', info.status);
        }
      });

      child.stderr?.on('data', (data) => {
        const output = data.toString();
        info.stderr += output;
        console.error(`[PREVIEW] [${projectId}] stderr: ${output.trim()}`);
        console.log('[PREVIEW-DEBUG] stderr', output.trim());
        if (output.toLowerCase().includes('error')) {
          info.status = 'error';
          info.npmRunDevError = output.trim();
          console.log('[PREVIEW-DEBUG] server status', info.status);
        }
      });

      child.on('error', (err) => {
        console.error(`[PREVIEW] [${projectId}] process error:`, err);
        info.status = 'error';
        info.error = err.message;
        console.log('[PREVIEW-DEBUG] server status', info.status);
      });

      child.on('exit', (code) => {
        console.log(`[PREVIEW] [${projectId}] process exited with code ${code}`);
        console.log('[PREVIEW-DEBUG] process exit', code);
        info.processExitCode = code;
        info.status = code === 0 ? 'stopped' : 'error';
        console.log('[PREVIEW-DEBUG] server status', info.status);
        info.process = null;
      });

      return info;
    } catch (error: any) {
      console.error(`[PREVIEW] [${projectId}] failed to start:`, error);
      info.status = 'error';
      info.error = error.message;
      console.log('[PREVIEW-DEBUG] server status', info.status);
      return info;
    }
  }

  private async runCommandWithOutput(command: string, args: string[], cwd: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        shell: true,
        stdio: 'pipe',
      });
      let stderr = '';
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      child.on('close', (code) => {
        if (code === 0) resolve();
        else {
          const err = new Error(stderr || `Command ${command} exited with code ${code}`);
          (err as any).exitCode = code;
          reject(err);
        }
      });
      child.on('error', reject);
    });
  }

  private async findFreePort(startPort: number): Promise<number> {
    let port = startPort;
    while (true) {
      try {
        await new Promise<void>((resolve, reject) => {
          const s = net.createServer();
          s.once('error', reject);
          s.once('listening', () => {
            s.close();
            resolve();
          });
          s.listen(port);
        });
        return port;
      } catch {
        port++;
      }
    }
  }

  async stop(projectId: string) {
    const info = this.projects.get(projectId);
    if (info && info.process) {
      info.process.kill();
      info.status = 'stopped';
      info.process = null;
    }
  }

  async restart(projectId: string) {
    await this.stop(projectId);
    return this.start(projectId);
  }

  getStatus(projectId: string): ProjectInfo | undefined {
    return this.projects.get(projectId);
  }

  getUrl(projectId: string): string | undefined {
    return this.projects.get(projectId)?.url;
  }
}

export const projectServerManager = new ProjectServerManager();
