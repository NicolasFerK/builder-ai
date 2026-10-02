import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { projectServerManager } from "../../services/ProjectServerManager";

export default defineHandler(async (event) => {
  const body = await readBody(event);
  const { projectId } = body;

  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'projectId is required',
    });
  }

  try {
    const info = await projectServerManager.restart(projectId);
    
    if (info.status === 'error') {
      return {
        success: false,
        projectId,
        port: info.port,
        url: info.internalUrl,
        status: info.status,
        error: info.error,
        statusMessage: info.error,
      };
    }

    // Wait for the server to be actually ready before responding
    const isReady = await projectServerManager.waitForReady(projectId);
    
    if (!isReady) {
      throw new Error('Vite server restarted but failed to become ready within the timeout.');
    }

    return {
      success: true,
      projectId,
      port: info.port,
      url: info.publicUrl,
      status: info.status,
    };
  } catch (error: any) {
    console.error('Failed to restart preview:', error);
    const info = projectServerManager.getStatus(projectId);
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to restart preview',
      data: {
        diagnostics: info ? {
          stdout: info.stdout,
          stderr: info.stderr,
          npmInstallError: info.npmInstallError,
          npmInstallExitCode: info.npmInstallExitCode,
          npmRunDevError: info.npmRunDevError,
          processExitCode: info.processExitCode,
          error: info.error,
        } : undefined,
      },
    });
  }
});
