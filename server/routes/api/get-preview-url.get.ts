import { defineEventHandler } from "nitro";
import { getQuery, createError } from "nitro/h3";
import { projectServerManager } from '../../services/ProjectServerManager';

export default defineEventHandler(async (event) => {
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
      url: info.url,
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
    url: info.url,
    status: info.status,
  };
});
