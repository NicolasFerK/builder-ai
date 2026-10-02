import { spawn, ChildProcess, exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import net from 'net';
import { promisify } from 'util';

const execPromise = promisify(exec);

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
  
  private operationLock: Promise<void> = Promise.resolve();

  private async acquireLock<T>(task: () => Promise<T>): Promise<T> {
    const currentLock = this.operationLock;
    let release: () => void;
    const nextLock = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.operationLock = nextLock;

    await currentLock;
    try {
      return await task();
    } finally {
      release!();
    }
  }

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

    const manager = detectedManagers[0] || preferredManager || 'npm';
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

  private async getPublicUrl(port: number): Promise<string> {
    const { configService } = await import('./ConfigService');
    const publicPreviewUrl = await configService.getPublicPreviewUrl();
    if (!publicPreviewUrl) {
      return `http://127.0.0.1:${port}`;
    }
    const base = publicPreviewUrl.endsWith('/') ? publicPreviewUrl.slice(0, -1) : publicPreviewUrl;
    return `${base}/`;
  }

  private async cleanupOrphanProcess(port: number): Promise<boolean> {
    try {
      // Use ss to find processes listening on the specific port.
      // 'ss -lptn sport = :<port>' returns lines with process info.
      const { stdout: ssStdout } = await execPromise(`ss -lptn 'sport = :${port}'`);
      if (!ssStdout.trim()) return false;

      const lines = ssStdout.trim().split('\n');
      let anyKilled = false;

      for (const line of lines) {
        // Parse PID from something like: users:(("node",pid=1234,fd=45))
        const pidMatch = line.match(/pid=(\d+)/);
        if (!pidMatch) continue;
        const pid = parseInt(pidMatch[1], 10);

        // Verify ownership via CWD and Command
        let cwd = '';
        try {
          // readlink -f /proc/<pid>/cwd is a reliable way to get the real CWD on Linux
          const { stdout: cwdStdout } = await execPromise(`readlink -f /proc/${pid}/cwd`);
          cwd = cwdStdout.trim();
        } catch (e) {
          // Could not get CWD, skip this PID
          continue;
        }

        let command = '';
        try {
          const { stdout: cmdStdout } = await execPromise(`ps -p ${pid} -o args=`);
          command = cmdStdout.trim();
        } catch (e) {
          // Could not get command, skip this PID
          continue;
        }

        const isInsideProjects = cwd.startsWith(this.projectsRoot);
        const isDevServer = /vite|npm|pnpm|yarn/i.test(command);

        if (isInsideProjects && isDevServer) {
          console.log(`[PREVIEW] Detected BuilderAI orphan process: PID ${pid}, CWD: ${cwd}, CMD: ${command}`);
          
          try {
            // Try SIGTERM to the process group first (since we use detached: true)
            process.kill(-pid, 'SIGTERM');
          } catch (e: any) {
            try { process.kill(pid, 'SIGTERM'); } catch {}
          }

          // Wait for it to exit
          let exited = false;
          for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 500));
            try {
              process.kill(pid, 0); // Check if process still exists
            } catch {
              exited = true;
              break;
            }
          }

          if (!exited) {
            console.warn(`[PREVIEW] Process ${pid} did not exit with SIGTERM, sending SIGKILL.`);
            try {
              process.kill(-pid, 'SIGKILL');
            } catch (e: any) {
              try { process.kill(pid, 'SIGKILL'); } catch {}
            }
            await new Promise(r => setTimeout(r, 1000));
          }
          anyKilled = true;
        } else {
          console.log(`[PREVIEW] Skipping non-BuilderAI process: PID ${pid}, CWD: ${cwd}, CMD: ${command}`);
        }
      }

      return anyKilled;
    } catch (err) {
      console.error(`[PREVIEW] Error in cleanupOrphanProcess:`, err);
      return false;
    }
  }

  async start(projectId: string): Promise<ProjectInfo> {
    return this.acquireLock(() => this._start(projectId));
  }

  private async _start(projectId: string): Promise<ProjectInfo> {
    if (this.projects.has(projectId)) {
      const existing = this.projects.get(projectId)!;
      if (existing.status === 'running' || existing.status === 'starting') {
        return existing;
      }
    }

    for (const [otherProjectId, otherInfo] of this.projects.entries()) {
      if (
        otherProjectId !== projectId &&
        (otherInfo.status === 'running' || otherInfo.status === 'starting')
      ) {
        console.log(`[PREVIEW] Switching from ${otherProjectId} to ${projectId}`);
        await this._stop(otherProjectId);
      }
    }

    const projectPath = path.join(this.projectsRoot, projectId);
    const port = this.PREVIEW_PORT;
    const internalUrl = `http://127.0.0.1:${port}`;
    const publicUrl = await this.getPublicUrl(port);

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
      try {
        await fs.mkdir(projectPath, { recursive: true });
      } catch (e) {
        console.error(`[PREVIEW] Failed to create directory ${projectPath}`, e);
      }

      const isPortManaged = Array.from(this.projects.values()).some(
        p => p.port === port && (p.status === 'running' || p.status === 'starting') && p.projectPath !== projectPath
      );

      if (isPortManaged) {
        throw new Error(`Port ${port} is already in use by another preview project.`);
      }

      let isPortFree = await this.isPortAvailable(port);
      if (!isPortFree) {
        console.log(`[PREVIEW] Port ${port} is occupied. Checking for orphans...`);
        const cleanedUp = await this.cleanupOrphanProcess(port);
        if (cleanedUp) {
          isPortFree = await this.isPortAvailable(port);
        }
      }

      if (!isPortFree) {
        throw new Error(`Port ${port} is already occupied by another process on this machine.`);
      }

      console.log('[PREVIEW] starting project', { projectId, projectPath, port, publicUrl });

      const { manager: pkgManager, conflict } = await this.getPackageManager(projectPath);
      if (conflict) console.warn(`[PREVIEW] ${conflict}`);

      const nodeModulesPath = path.join(projectPath, 'node_modules');
      let needsInstall = false;

      try {
        await fs.access(nodeModulesPath);
      } catch {
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
          try {
            await fs.rm(path.join(projectPath, lockfile), { force: true });
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

      console.log(`[PREVIEW] starting dev server with ${pkgManager} on port: ${port}`);

      let command = '';
      if (pkgManager === 'npm') {
        command = `npm run dev -- --port ${port} --host 0.0.0.0 --strictPort`;
      } else if (pkgManager === 'pnpm') {
        command = `pnpm run dev --port ${port} --host 0.0.0.0 --strictPort`;
      } else if (pkgManager === 'yarn') {
        command = `yarn dev --port ${port} --host 0.0.0.0 --strictPort`;
      } else {
        command = `${pkgManager} run dev --port ${port} --host 0.0.0.0 --strictPort`;
      }

      info.command = command;
      info.cwd = projectPath;

      const child = spawn(command, [], {
        cwd: projectPath,
        shell: true,
        detached: true,
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

      const isReady = await this.waitForReady(projectId, 15000);
      if (!isReady) {
        await this.terminateProcessGroup(child);
        const errorMsg = `Vite failed to become responsive on port ${port} within 15 seconds.`;
        const diagnostics = [
          `Error: ${errorMsg}`,
          `Command: ${command}`,
          `CWD: ${projectPath}`,
          `PID: ${child.pid || 'unknown'}`,
          `Dev Server Stdout: ${info.stdout.slice(-500)}`,
          `Dev Server Stderr: ${info.stderr.slice(-500)}`,
        ].join('\n');
        throw new Error(diagnostics);
      }

      return info;

    } catch (error: any) {
      console.error(`[PREVIEW] [${projectId}] failed to start:`, error);
      info.status = 'error';
      info.error = error.message;
      if (info.process) {
        const failedProcess = info.process;
        await this.terminateProcessGroup(failedProcess);
        if (info.process === failedProcess) info.process = null;
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
      const child = spawn(cmd, [], { cwd, shell: true, stdio: 'pipe' });
      let stdout = '';
      let stderr = '';
      child.stdout?.on('data', (data) => { stdout += data.toString(); });
      child.stderr?.on('data', (data) => { stderr += data.toString(); });
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

  private async terminateProcessGroup(child: ChildProcess): Promise<void> {
    const pid = child.pid;
    if (!pid) {
      try { child.kill('SIGTERM'); } catch {}
      return;
    }

    const signalGroup = (signal: NodeJS.Signals) => {
      try { process.kill(-pid, signal); } catch (error: any) {
        if (error.code !== 'ESRCH') {
          try { child.kill(signal); } catch {}
        }
      }
    };

    const groupExists = (): boolean => {
      try { process.kill(-pid, 0); return true; } catch (error: any) { return error.code === 'EPERM'; };
    };

    const waitForGroupExit = async (timeoutMs: number): Promise<boolean> => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        if (!groupExists()) return true;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return !groupExists();
    };

    signalGroup('SIGTERM');
    if (await waitForGroupExit(5000)) return;

    console.warn(`[PREVIEW] Grupo ${pid} não encerrou; enviando SIGKILL.`);
    signalGroup('SIGKILL');
    await waitForGroupExit(3000);
  }

  async stop(projectId: string) {
    return this.acquireLock(() => this._stop(projectId));
  }

  private async _stop(projectId: string) {
    const info = this.projects.get(projectId);
    if (!info) return;
    if (info.process) await this.terminateProcessGroup(info.process);
    info.process = null;
    info.status = 'stopped';
  }

  async restart(projectId: string) {
    return this.acquireLock(async () => {
      await this._stop(projectId);
      return await this._start(projectId);
    });
  }

  getStatus(projectId: string): ProjectInfo | undefined {
    return this.projects.get(projectId);
  }

  getUrl(projectId: string): string | undefined {
    return this.projects.get(projectId)?.publicUrl;
  }
}

export const projectServerManager = new ProjectServerManager();
