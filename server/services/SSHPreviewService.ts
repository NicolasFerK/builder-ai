import { Client } from 'ssh2';
import fs from 'fs/promises';
import path from 'path';
import { SSHConfig } from '../../src/types';
import { jobManager } from './JobManager';

interface SSHPreviewServiceOptions {
  projectId: string;
  config: SSHConfig;
  projectRoot: string;
  jobId: string;
}

export class SSHPreviewService {
  constructor(private options: SSHPreviewServiceOptions) {}

  async run(onStatus: (status: string) => void): Promise<void> {
    const { projectId, config, projectRoot, jobId } = this.options;
    const conn = new Client();

    try {
      jobManager.updateJob(jobId, { status: 'in_progress', progress: 'Conectando ao SSH...' });
      onStatus('Conectando ao SSH...');
      await this.connect(conn, config);

      const remoteDir = `/workspace/preview/${projectId}`;

      jobManager.updateJob(jobId, { progress: 'Preparando diretório remoto...' });
      onStatus('Preparando diretório remoto...');
      await this.execute(conn, `mkdir -p ${remoteDir}`);

      jobManager.updateJob(jobId, { progress: 'Enviando arquivos via SFTP...' });
      onStatus('Enviando arquivos via SFTP...');
      await this.uploadFiles(conn, projectRoot, remoteDir);

      jobManager.updateJob(jobId, { progress: 'Instalando dependências...' });
      onStatus('Instalando dependências...');
      await this.execute(conn, `cd ${remoteDir} && ${this.getInstallCommand(projectRoot)}`);

      jobManager.updateJob(jobId, { progress: 'Reiniciando servidor remoto...' });
      onStatus('Reiniciando servidor remoto...');
      // Kill any existing process on port 5173
      await this.execute(conn, `fuser -k 5173/tcp || true`);
      
      // Start the server in the background
      const logFile = `/tmp/preview_${projectId}.log`;
      const startCommand = `cd ${remoteDir} && nohup npm run dev -- --host 0.0.0.0 --port 5173 > ${logFile} 2>&1 < /dev/null &`;
      await this.execute(conn, startCommand);

      // Wait until Vite responds, rather than assuming it started successfully.
      jobManager.updateJob(jobId, { progress: 'Aguardando o Vite iniciar...' });
      onStatus('Aguardando o Vite iniciar...');

      const healthCheck = `for i in $(seq 1 20); do if curl -fsS http://127.0.0.1:5173/ >/dev/null 2>&1; then exit 0; fi; sleep 1; done; echo 'Vite não respondeu na porta 5173. Log do servidor:'; cat ${logFile}; exit 1`;
      await this.execute(conn, healthCheck);

      jobManager.updateJob(jobId, { status: 'completed', progress: 'Servidor Vite pronto!' });
      onStatus('Sucesso!');
    } catch (error: any) {
      console.error('[SSHPreviewService] Error:', error);
      jobManager.updateJob(jobId, { status: 'failed', error: error.message });
      throw error;
    } finally {
      conn.end();
    }
  }

  private connect(conn: Client, config: SSHConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      conn.on('ready', resolve).on('error', reject).connect({
        host: config.host,
        port: config.port,
        username: config.user,
        privateKey: config.privateKey,
        password: config.password,
      });
    });
  }

  private execute(conn: Client, command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      conn.exec(command, (err, stream) => {
        if (err) return reject(err);
        
        let stderr = '';
        stream.on('close', (code: number) => {
          if (code !== 0) {
            reject(new Error(`Command "${command}" failed with code ${code}. Stderr: ${stderr}`));
          } else {
            resolve();
          }
        }).on('data', (data) => {
          // We could log stdout if needed
        }).stderr.on('data', (data) => {
          stderr += data.toString();
        });
      });
    });
  }

  private async uploadFiles(conn: Client, localRoot: string, remoteDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) return reject(err);

        const uploadRecursive = async (localPath: string, remotePath: string) => {
          const stats = await fs.stat(localPath);

          if (stats.isDirectory()) {
            await this.ensureRemoteDir(sftp, remotePath);
            const items = await fs.readdir(localPath);
            for (const item of items) {
              if (item === 'node_modules' || item === '.git') continue;
              await uploadRecursive(path.join(localPath, item), path.join(remotePath, item));
            }
          } else {
            await this.uploadFile(sftp, localPath, remotePath);
          }
        };

        uploadRecursive(localRoot, remoteDir)
          .then(resolve)
          .catch(reject);
      });
    });
  }

  private async ensureRemoteDir(sftp: any, remotePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      sftp.mkdir(remotePath, { recursive: true }, (err: any) => {
        if (err && err.code !== 'EEXIST') return reject(err);
        resolve();
      });
    });
  }

  private uploadFile(sftp: any, localPath: string, remotePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      sftp.fastPut(localPath, remotePath, (err: any) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  private getInstallCommand(projectRoot: string): string {
    return `if [ -f "pnpm-lock.yaml" ]; then pnpm install; elif [ -f "yarn.lock" ]; then yarn install; else npm install; fi`;
  }
}
