import { defineHandler } from "nitro";
import { getQuery, createError } from "nitro/h3";
import { projectServerManager } from '../../services/ProjectServerManager';

export default defineHandler(async (event) => {
  const query = getQuery(event);
  const projectId = query.projectId as string;

  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'projectId is required',
    });
  }

  const info = projectServerManager.getStatus(projectId);

  if (!info) {
    return {
      status: 'not_found',
    };
  }

  if (info.status === 'error') {
    return {
      url: info.internalUrl, // Return internal URL when in error state to avoid public URL issues
      status: info.status,
      diagnostics: {
        projectId,
        projectPath: info.projectPath,
        status: info.status,
        port: info.port,
        stdout: info.stdout,
        stderr: info.stderr,
        error: info.error,
        exitCode: info.processExitCode,
        npmInstallError: info.npmInstallError,
        npmInstallExitCode: info.npmInstallExitCode,
        npmRunDevError: info.npmRunDevError,
      }
    };
  }

  return {
    url: info.publicUrl,
    status: info.status,
  };
});
