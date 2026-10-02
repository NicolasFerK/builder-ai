import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { projectServerManager } from "../../services/ProjectServerManager";

export default defineHandler(async (event) => {
  const body = await readBody(event);
  const { projectId } = body;

  console.log('[PREVIEW-DEBUG] projectId', projectId);

  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'projectId is required',
    });
  }

  try {
    const info = await projectServerManager.start(projectId);
    
    // Wait for the server to be actually ready before responding
    const isReady = await projectServerManager.waitForReady(projectId);
    
    if (!isReady && info.status !== 'error') {
      throw new Error('Vite server started but failed to become ready within the timeout.');
    }

    // If the status is error, we return the internal URL to avoid serving a public URL that doesn't work.
    const finalUrl = info.status === 'error' ? info.internalUrl : info.publicUrl;
    
    return {
      success: true,
      projectId,
      port: info.port,
      url: finalUrl,
      status: info.status,
    };
  } catch (error: any) {
    console.error('Failed to start preview:', error);
    const info = projectServerManager.getStatus(projectId);
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to start preview',
      data: {
        diagnostics: info ? {
          stdout: info.stdout,
          stderr: info.stderr,
          npmInstallError: info.npmInstallError,
          npmInstallExitCode: info.npmInstallExitCode,
          npmRunDevError: info.npmRunDevError,
          processExitCode: info.processExitCode,
          processSignal: info.processSignal,
          command: info.command,
          cwd: info.cwd,
          error: info.error,
        } : undefined,
      },
    });
  }
});
