import { spawn, ChildProcess } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import net from 'net';

export interface ProjectInfo {
  process: ChildProcess | null;
  port: number;
  internalUrl: string;
  publicUrl: string;
  status: 'running' | 'starting' | 'stopped' | 'error';
  projectPath: string;
  stdout: string;
  stderr: string;
  npmInstallError: string | null;
  npmInstallExitCode: number | null;
  npmRunDevError: string | null;
  processExitCode: number | null;
  processSignal: string | null;
  command: string | null;
  cwd: string | null;
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

  private getPublicUrl(port: number): string {
    const publicBaseUrl = process.env.PREVIEW_PUBLIC_BASE_URL;
    if (!publicBaseUrl) {
      return `http://127.0.0.1:${port}`;
    }
    const base = publicBaseUrl.endsWith('/') ? publicBaseUrl.slice(0, -1) : publicBaseUrl;
    return `${base}/`;
  }

  async start(projectId: string): Promise<ProjectInfo> {
    // 1. Check if project is already being managed
    if (this.projects.has(projectId)) {
      const existing = this.projects.get(projectId)!;
      if (existing.status === 'running' || existing.status === 'starting') {
        return existing;
      }
    }

    const projectPath = path.join(this.projectsRoot, projectId);
    const port = this.PREVIEW_PORT;
    const internalUrl = `http://127.0.0.1:${port}`;
    const publicUrl = this.getPublicUrl(port);

    // 2. Create the project info entry IMMEDIATELY to prevent race conditions
    const info: ProjectInfo = {
      process: null,
      port,
      internalUrl,
      publicUrl,
      status: 'starting',
      projectPath,
      stdout: '',
      stderr: '',
      npmInstallExitCode: null,
      npmInstallError: null,
      npmRunDevError: null,
      processExitCode: null,
      processSignal: null,
      command: null,
      cwd: null,
      error: null,
    };
    this.projects.set(projectId, info);

    try {
      // 3. Ensure directory exists
      try {
        await fs.mkdir(projectPath, { recursive: true });
      } catch (e) {
        console.error(`[PREVIEW] Failed to create directory ${projectPath}`, e);
      }

      // 4. Check for port conflicts (other projects or other processes)
      const isPortManaged = Array.from(this.projects.values()).some(
        p => p.port === port && (p.status === 'running' || p.status === 'starting') && p.projectPath !== projectPath
      );

      if (isPortManaged) {
        const errorMsg = `Port ${port} is already in use by another preview project.`;
        throw new Error(errorMsg);
      }

      const isPortFree = await this.isPortAvailable(port);
      if (!isPortFree) {
        const errorMsg = `Port ${port} is already occupied by another process on this machine.`;
        throw new Error(errorMsg);
      }

      console.log('[PREVIEW] starting project', { projectId, projectPath, port, publicUrl });

      // 5. Package Manager & Dependencies
      const { manager: pkgManager, conflict } = await this.getPackageManager(projectPath);
      if (conflict) {
        console.warn(`[PREVIEW] ${conflict}`);
      }

      const nodeModulesPath = path.join(projectPath, 'node_modules');
      let needsInstall = false;

      try {
        await fs.access(nodeModulesPath);
      } catch {
        console.log(`[PREVIEW] node_modules not found, installing dependencies with ${pkgManager}...`);
        needsInstall = true;
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
          info.npmInstallError = err.message;
          info.npmInstallExitCode = err.exitCode ?? -1;
          throw err;
        }
      }

      // 6. Start Dev Server
      console.log(`[PREVIEW] starting dev server with ${pkgManager} on port: ${port}`);

      let command = '';
      if (pkgManager === 'npm' || pkgManager === 'pnpm') {
        command = `${pkgManager} run dev -- --port ${port} --host 0.0.0.0 --strictPort`;
      } else if (pkgManager === 'yarn') {
        command = `yarn dev --port ${port} --host 0.0.0.0 --strictPort`;
      } else {
        command = `${pkgManager} run dev --port ${port} --host 0.0.0.0 --strictPort`;
      }

      info.command = command;
      info.cwd = projectPath;

      console.log(`[PREVIEW] Executing command: \"${command}\" in ${projectPath}`);

      const child = spawn(command, [], {
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
          info.npmRunDevError = output.trim();
        }
      });

      child.on('error', (err) => {
        console.error(`[PREVIEW] Process error:`, err);
        info.status = 'error';
        info.error = err.message;
      });

      child.on('exit', (code, signal) => {
        console.log(`[PREVIEW] Process exited with code ${code} and signal ${signal}`);
        info.processExitCode = code;
        info.processSignal = signal;
        info.status = (code === 0) ? 'stopped' : 'error';
        info.process = null;
      });

      // 7. Wait for the port to actually be responsive
      const isReady = await this.waitForReady(projectId, 15000);
      if (!isReady) {
        console.error(`[PREVIEW] Vite failed to become responsive on port ${port} within 15 seconds.`);
        
        // Cleanup
        if (child.pid) {
          try {
            child.kill('SIGKILL');
          } catch (e) {}
        }
        
        // Wait for process to actually exit to free the port and populate exitCode/signal
        await new Promise(resolve => child.on('exit', resolve));

        const errorMsg = `Vite failed to become responsive on port ${port} within 15 seconds.`;
        const diagnostics = [
          `Error: ${errorMsg}`,
          `Command: ${command}`,
          `CWD: ${projectPath}`,
          `PID: ${child.pid || 'unknown'}`,
          `Exit Code: ${child.exitCode}`,
          `Exit Signal: ${child.signal}`,
          `Installation Status: ${info.npmInstallExitCode === 0 ? 'Success' : 'Failed/Not run'}`,
          `Installation Error: ${info.npmInstallError || 'None'}`,
          `Dev Server Stdout: ${info.stdout.slice(-500)}`, // last 500 chars
          `Dev Server Stderr: ${info.stderr.slice(-500)}`, // last 500 chars
        ].join('\\n');
        
        throw new Error(diagnostics);
      }

      return info;

    } catch (error: any) {
      console.error(`[PREVIEW] [${projectId}] failed to start:`, error);
      info.status = 'error';
      info.error = error.message;
      
      // If it failed during starting, ensure we clean up the process if it exists
      if (info.process) {
        try {
          info.process.kill('SIGKILL');
        } catch (e) {}
        // Wait for it to be fully gone
        await new Promise(resolve => info.process?.on('exit', resolve));
        info.process = null;
      }
      
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
      const cmd = args.length > 0 ? `${command} ${args.join(' ')}` : command;
      const child = spawn(cmd, [], {
        cwd,
        shell: true,
        stdio: 'pipe',
      });
      let stdout = '';
      let stderr = '';
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      child.on('close', (code) => {
        if (code === 0) resolve();
        else {
          const err = new Error(stderr || `Command ${command} exited with code ${code}`);
          (err as any).exitCode = code;
          (err as any).stderr = stderr;
          (err as any).stdout = stdout;
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
    return this.projects.get(projectId)?.publicUrl;
  }
}

export const projectServerManager = new ProjectServerManager();
