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

class CommandError extends Error {
  exitCode: number;
  stderr: string;
  stdout: string;
  constructor(message: string, exitCode: number, stderr: string, stdout: string) {
    super(message);
    this.name = 'CommandError';
    this.exitCode = exitCode;
    this.stderr = stderr;
    this.stdout = stdout;
  }
}

class ProjectServerManager {
  private projects: Map<string, ProjectInfo> = new Map();
  private readonly projectsRoot = path.join(process.cwd(), 'projects');
  private readonly PREVIEW_PORT = 5173;
  
  private operationLock: Promise<void> = Promise.resolve();
  private projectQueues: Map<string, Promise<any>> = new Map();

  private async runQueued<T>(projectId: string, task: () => Promise<T>): Promise<T> {
    const currentQueue = this.projectQueues.get(projectId) || Promise.resolve();
    
    let resolveNext: () => void;
    const nextQueue = new Promise<void>((resolve) => {
      resolveNext = resolve;
    });

    this.projectQueues.set(projectId, nextQueue);

    try {
      await currentQueue;
      return await task();
    } finally {
      resolveNext!();
    }
  }

  private async acquireLock<T>(task: () => Promise<T>): Promise<T> {
    const currentLock = this.operationLock;
    let release: (() => void) | undefined;
    const nextLock = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.operationLock = nextLock;

    await currentLock;
    try {
      return await task();
    } finally {
      if (release) release();
    }
  }

  async getPackageManager(projectPath: string): Promise<{ manager: string; conflict: string | null }> {
    let preferredManager: string | null = null;
    const detectedManagers: string[] = [];
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
    } catch {
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
    } catch {
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

  private isDirectoryInside(parent: string, child: string): boolean {
    try {
      const absParent = path.resolve(parent);
      const absChild = path.resolve(child);
      const relative = path.relative(absParent, absChild);
      if (!relative || path.isAbsolute(relative)) return false;
      return !(relative.startsWith('..' + path.sep) || relative === '..');
    } catch {
      return false;
    }
  }

  private async cleanupOrphanProcess(port: number): Promise<boolean> {
    try {
      const { stdout: ssStdout } = await execPromise(`ss -lptn 'sport = :${port}'`);
      if (!ssStdout.trim()) return false;

      const lines = ssStdout.trim().split('\\\\n');
      let anyKilled = false;

      for (const line of lines) {
        const pidMatch = line.match(/pid=(\\\\d+)/);
        if (!pidMatch) continue;
        const pid = parseInt(pidMatch[1], 10);

        let pgid = -1;
        let cwd = '';
        let command = '';

        try {
          const { stdout: psStdout } = await execPromise(`ps -p ${pid} -o pgid=,args=`);
          const parts = psStdout.trim().split(/\\\\s+/);
          if (parts.length < 2) continue;
          pgid = parseInt(parts[0], 10);
          command = parts.slice(1).join(' ');

          const { stdout: cwdStdout } = await execPromise(`readlink -f /proc/${pid}/cwd`);
          cwd = cwdStdout.trim();
        } catch {
          continue;
        }

        const isInsideProjects = this.isDirectoryInside(this.projectsRoot, cwd);
        const isDevServer = /vite|npm|pnpm|yarn|serve/i.test(command);

        if (isInsideProjects && isDevServer) {
          console.log(`[PREVIEW] Detected BuilderAI orphan process: PID ${pid}, PGID ${pgid}, CWD: ${cwd}, CMD: ${command}`);
          
          let shouldKillGroup = false;
          if (pid === pgid) {
            shouldKillGroup = true;
          } else {
            try {
              const { stdout: leaderPsStdout } = await execPromise(`ps -p ${pgid} -o args=`);
              const leaderCommand = leaderPsStdout.trim();
              const { stdout: leaderCwdStdout } = await execPromise(`readlink -f /proc/${pgid}/cwd`);
              const leaderCwd = leaderCwdStdout.trim();

              if (this.isDirectoryInside(this.projectsRoot, leaderCwd) && /vite|npm|pnpm|yarn|serve/i.test(leaderCommand)) {
                shouldKillGroup = true;
              }
            } catch {
              shouldKillGroup = false;
            }
          }

          const signal = (sig: string) => {
            if (shouldKillGroup) {
              try {
                process.kill(-pgid, sig);
              } catch (error: unknown) {
                if (error instanceof Error && error.code !== 'ESRCH') {
                  try { process.kill(pid, sig); } catch { /* ignore */ }
                }
              }
            } else {
              try { process.kill(pid, sig); } catch { /* ignore */ }
            }
          };

          signal('SIGTERM');

          let exited = false;
          for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 500));
            try {
              process.kill(pid, 0);
            } catch {
              exited = true;
              break;
            }
          }

          if (!exited) {
            console.warn(`[PREVIEW] Process ${pid} did not exit with SIGTERM, sending SIGKILL.`);
            signal('SIGKILL');
            await new Promise(r => setTimeout(r, 1000));
          }
          anyKilled = true;
        }
      }

      if (anyKilled) {
        await new Promise(r => setTimeout(r, 1000));
        return await this.isPortAvailable(port);
      }

      return false;
    } catch (err: unknown) {
      console.error(`[PREVIEW] Error in cleanupOrphanProcess:`, err);
      return false;
    }
  }

  async start(projectId: string): Promise<ProjectInfo> {
    return this.acquireLock(() => this._start(projectId));
  }

  private async _start(projectId: string, portOverride?: number): Promise<ProjectInfo> {
    if (this.projects.has(projectId)) {
      const existing = this.projects.get(projectId);
      if (existing && (existing.status === 'running' || existing.status === 'starting')) {
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
    const port = portOverride ?? this.PREVIEW_PORT;
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
      } catch (e: unknown) {
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
        } catch (err: unknown) {
          console.error(`[PREVIEW] Failed to remove existing node_modules:`, err);
        }

        const lockfiles = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'];
        for (const lockfile of lockfiles) {
          try {
            await fs.rm(path.join(projectPath, lockfile), { force: true });
          } catch { /* ignore */ }
        }

        try {
          await this.runCommandWithOutput(pkgManager, ['install'], projectPath);
          info.npmInstallExitCode = 0;
        } catch (err: unknown) {
          if (err instanceof CommandError) {
            info.npmInstallError = err.message;
            info.npmInstallExitCode = err.exitCode;
          } else {
            info.npmInstallError = err instanceof Error ? err.message : String(err);
            info.npmInstallExitCode = -1;
          }
          throw err;
        }
      }

      console.log(`[PREVIEW] building project in ${projectPath}...`);
      try {
        await this.runCommandWithOutput(pkgManager, ['run', 'build'], projectPath);
      } catch (err: unknown) {
        if (err instanceof CommandError) {
          info.npmRunDevError = `Build failed: ${err.message}`;
        } else {
          info.npmRunDevError = `Build failed: ${err instanceof Error ? err.message : String(err)}`;
        }
        throw err;
      }

      console.log(`[PREVIEW] starting static server on port: ${port}`);

      const builderAiServePath = path.resolve(process.cwd(), 'node_modules', '.bin', 'serve');
      const args = ["-s", "dist", "-l", `tcp://0.0.0.0:${port}`];
      const command = builderAiServePath;

      info.command = `${command} ${args.join(' ')}`;
      info.cwd = projectPath;

      const child = spawn(command, args, {
        cwd: projectPath,
        shell: true,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      info.process = child;

      child.stdout?.on('data', (data) => {
        const output = data.toString();
        info.stdout += output;
        if (output.includes('ready in') || output.includes('VITE v') || output.includes('Accepting connections')) {
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
        const errorMsg = `Preview server failed to become responsive on port ${port} within 15 seconds.`;
        const diagnostics = [
          `Error: ${errorMsg}`,
          `Command: ${command}`,
          `CWD: ${projectPath}`,
          `PID: ${child.pid || 'unknown'}`,
          `Server Stdout: ${info.stdout.slice(-500)}`,
          `Server Stderr: ${info.stderr.slice(-500)}`,
        ].join('\n');
        throw new Error(diagnostics);
      }

      return info;

    } catch (error: unknown) {
      console.error(`[PREVIEW] [${projectId}] failed to start:`, error);
      info.status = 'error';
      info.error = error instanceof Error ? error.message : String(error);
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
          const err = new CommandError(stderr || `Command ${command} exited with code ${code}`, code ?? -1, stderr, stdout);
          reject(err);
        }
      });
      child.on('error', reject);
    });
  }

  private async terminateProcessGroup(child: ChildProcess): Promise<void> {
    const pid = child.pid;
    if (!pid) {
      try { child.kill('SIGTERM'); } catch { /* ignore */ }
      return;
    }

    const signalGroup = (signal: NodeJS.Signals) => {
      try {
        process.kill(-pid, signal);
      } catch (error: unknown) {
        if (error instanceof Error && error.code !== 'ESRCH') {
          try { child.kill(signal); } catch { /* ignore */ }
        }
      }
    };

    const groupExists = (): boolean => {
      try {
        process.kill(-pid, 0);
        return true;
      } catch (error: unknown) {
        return error instanceof Error && error.code === 'EPERM';
      }
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

  private async _stop(projectId: string) {
    const info = this.projects.get(projectId);
    if (!info) return;
    if (info.process) await this.terminateProcessGroup(info.process);
    info.process = null;
    info.status = 'stopped';
  }

  async restart(projectId: string) {
    return this.acquireLock(async () => {
      const info = this.projects.get(projectId);
      const port = info?.port;
      await this._stop(projectId);
      return await this._start(projectId, port);
    });
  }

  async applyCode(projectId: string, files: { path: string; content: string }[]): Promise<void> {
    await this.runQueued(projectId, async () => {
      const projectPath = path.join(this.projectsRoot, projectId);
      
      // 1. Write files
      for (const file of files) {
        const sanitizedPath = path.normalize(file.path).replace(/^(?:\.\.(?:[\\/]|$))+/, '');
        const filePath = path.join(projectPath, sanitizedPath);
        
        if (!filePath.startsWith(projectPath)) {
          throw new Error(`Attempted path traversal: ${file.path}`);
        }

        const dirPath = path.dirname(filePath);
        await fs.mkdir(dirPath, { recursive: true });
        await fs.writeFile(filePath, file.content, 'utf-8');
      }

      // 2. Build
      const { manager: pkgManager } = await this.getPackageManager(projectPath);
      console.log(`[PREVIEW] Building project ${projectId} with ${pkgManager}...`);
      try {
        await this.runCommandWithOutput(pkgManager, ['run', 'build'], projectPath);
      } catch (err: any) {
        throw new Error(`Build failed: ${err.message}`);
      }

      // 3. Restart Preview
      const info = this.projects.get(projectId);
      if (info && info.port) {
        await this.restart(projectId);
      }
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
