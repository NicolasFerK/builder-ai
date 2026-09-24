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

    const port = await this.findFreePort(5174);
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
      npmInstallError: null,
      npmInstallExitCode: null,
      npmRunDevError: null,
      processExitCode: null,
      error: null,
    };

    this.projects.set(projectId, info);

    try {
      console.log(`[PREVIEW] projectId: ${projectId}`);
      console.log(`[PREVIEW] projectRoot: ${projectPath}`);
      console.log(`[PREVIEW] starting dev server on port: ${port}`);
      console.log('[PREVIEW-DEBUG] projectId', projectId);
      console.log('[PREVIEW-DEBUG] projectPath', projectPath);

      // Check if node_modules exists
      const nodeModulesPath = path.join(projectPath, 'node_modules');
      const packageJsonPath = path.join(projectPath, 'package.json');
      try {
        await fs.access(packageJsonPath);
        console.log('[PREVIEW-DEBUG] package.json exists');
      } catch {
        console.log('[PREVIEW-DEBUG] package.json does NOT exist');
      }

      try {
        await fs.access(nodeModulesPath);
      } catch {
        console.log(`[PREVIEW] node_modules not found, installing dependencies in ${projectPath}...`);
        console.log('[PREVIEW-DEBUG] npm install started');
        try {
          await this.runCommandWithOutput('npm', ['install'], projectPath);
          info.npmInstallExitCode = 0;
          console.log('[PREVIEW-DEBUG] npm install exit code', 0);
        } catch (err: any) {
          info.npmInstallError = err.message;
          info.npmInstallExitCode = err.exitCode ?? -1;
          console.error('[PREVIEW-DEBUG] npm install error', err.message);
          throw err;
        }
      }

      console.log('[PREVIEW-DEBUG] npm run dev started');
      const child = spawn('npm', ['run', 'dev', '--', '--port', port.toString()], {
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
        if (code !== 0 && !info.npmRunDevError) {
           // If it's not a clean stop, and we don't have a specific error, maybe it's a crash
           // But we'll let stderr capture it if possible
        }
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
