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
  private readonly PREVIEW_PORT = 5173;

  async getPackageManager(projectPath: string): Promise<{ manager: string; conflict: string | null }> {
    let preferredManager: string | null = null;
    let detectedManagers: string[] = [];
    let conflict: string | null = null;

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

    if (detectedManagers.length > 1) {
      conflict = `Multiple lockfiles or package managers detected: ${detectedManagers.join(', ')}. Please clean up your project.`;
    } else if (preferredManager && detectedManagers.length > 0 && preferredManager !== detectedManagers[0]) {
      conflict = `Conflict: packageManager is ${preferredManager} but lockfile/structure suggests ${detectedManagers[0]}.`;
    }

    const manager = detectedManagers[0] || preferredManager || 'pnpm';
    return { manager, conflict };
  }

  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(port, '0.0.0.0');
    });
  }

  private async tryConnect(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.connect(port, '127.0.0.1');
    });
  }

  private async waitForPort(port: number, timeoutMs = 30000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await this.tryConnect(port)) return true;
      await new Promise(r => setTimeout(r, 1000));
    }
    return false;
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

    const port = this.PREVIEW_PORT;

    const isPortManaged = Array.from(this.projects.values()).some(
      p => p.port === port && (p.status === 'running' || p.status === 'starting')
    );

    if (isPortManaged) {
      const errorMsg = `Port ${port} is already in use by another preview project. Only one project can be previewed at a time.`;
      console.error('[PREVIEW] Port conflict:', errorMsg);
      throw new Error(errorMsg);
    }

    const isPortFree = await this.isPortAvailable(port);
    if (!isPortFree) {
      const errorMsg = `Port ${port} is already occupied by another process on this machine.`;
      console.error('[PREVIEW] Port conflict:', errorMsg);
      throw new Error(errorMsg);
    }

    const url = `http://127.0.0.1:${port}`;
    console.log('[PREVIEW-DEBUG] starting project', { projectId, projectPath, port, url });

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
        if (pkgManager === 'npm') {
          const pnpmDir = path.join(projectPath, 'node_modules', '.pnpm');
          try {
            await fs.access(pnpmDir);
            console.warn('[PREVIEW] Detected pnpm structure in node_modules while npm is chosen. Marking for clean install.');
            needsInstall = true;
          } catch {}
        }
      } catch {
        console.log(`[PREVIEW] node_modules not found, installing dependencies with ${pkgManager}...`);
        needsInstall = true;
      }

      if (conflict && conflict.includes('Multiple lockfiles')) {
          throw new Error(conflict);
      }

      if (needsInstall) {
        console.log(`[PREVIEW] Preparing fresh installation with ${pkgManager} in ${projectPath}...`);
        try {
          await fs.rm(nodeModulesPath, { recursive: true, force: true });
        } catch (err) {
          console.error(`[PREVIEW] Failed to remove existing node_modules:`, err);
        }

        const lockfiles = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'];
        for (const lockfile of lockfiles) {
          const lockfilePath = path.join(projectPath, lockfile);
          try {
            await fs.rm(lockfilePath, { force: true });
          } catch (err) {}
        }

        try {
          await this.runCommandWithOutput(pkgManager, ['install'], projectPath);
          info.npmInstallExitCode = 0;
        } catch (err: any) {
          if (pkgManager === 'npm' && err.message.includes('matches')) {
            console.log('[PREVIEW] Detected potential npm corruption. Retrying with --no-package-lock...');
            try {
              await this.runCommandWithOutput(pkgManager, ['install', '--no-package-lock'], projectPath);
              info.npmInstallExitCode = 0;
            } catch (fallbackErr: any) {
              info.npmInstallError = fallbackErr.message;
              info.npmInstallExitCode = fallbackErr.exitCode ?? -1;
              throw fallbackErr;
            }
          } else {
            info.npmInstallError = err.message;
            info.npmInstallExitCode = err.exitCode ?? -1;
            throw err;
          }
        }
      }

      console.log(`[PREVIEW] starting dev server with ${pkgManager} on port: ${port}`);

      const devArgs = pkgManager === 'npm' || pkgManager === 'pnpm'
        ? ['run', 'dev', '--', '--port', port.toString(), '--host', '0.0.0.0', '--strictPort']
        : ['run', 'dev', '--port', port.toString(), '--host', '0.0.0.0', '--strictPort'];

      const child = spawn(pkgManager, devArgs, {
        cwd: projectPath,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      info.process = child;

      child.stdout?.on('data', (data) => {
        const output = data.toString();
        info.stdout += output;
        if (output.includes('ready in') || output.includes('VITE v')) {
           info.status = 'running';
        }
      });

      child.stderr?.on('data', (data) => {
        const output = data.toString();
        info.stderr += output;
        if (output.toLowerCase().includes('error')) {
          info.status = 'error';
          info.npmRunDevError = output.trim();
        }
      });

      child.on('error', (err) => {
        info.status = 'error';
        info.error = err.message;
      });

      child.on('exit', (code) => {
        info.processExitCode = code;
        info.status = code === 0 ? 'stopped' : 'error';
        info.process = null;
      });

      return info;
    } catch (error: any) {
      console.error(`[PREVIEW] [${projectId}] failed to start:`, error);
      info.status = 'error';
      info.error = error.message;
      return info;
    }
  }

  async waitForReady(projectId: string, timeoutMs = 30000): Promise<boolean> {
    const info = this.projects.get(projectId);
    if (!info) return false;
    return this.waitForPort(info.port, timeoutMs);
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
          (err as any).stderr = stderr;
          reject(err);
        }
      });
      child.on('error', reject);
    });
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
