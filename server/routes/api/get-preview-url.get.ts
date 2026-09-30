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

  // Get the public base URL from environment variables
  // The user should set PREVIEW_PUBLIC_BASE_URL in their RunPod environment.
  // e.g. PREVIEW_PUBLIC_BASE_URL=https://your-pod-id-5173.proxy.runpod.net
  const publicBaseUrl = process.env.PREVIEW_PUBLIC_BASE_URL;

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

  let finalUrl = info.url;
  if (publicBaseUrl && info.port === 5173) {
    // If we are using the public port 5173, construct the public URL
    // Ensure there is no trailing slash in publicBaseUrl to avoid double slashes
    const base = publicBaseUrl.endsWith('/') ? publicBaseUrl.slice(0, -1) : publicBaseUrl;
    finalUrl = `${base}/`;
  }

  return {
    url: finalUrl,
    status: info.status,
  };
});
