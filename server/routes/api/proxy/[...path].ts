import { defineHandler } from "nitro";
import { proxyRequest, createError } from "nitro/h3";
import { projectServerManager } from "../../services/ProjectServerManager";

export default defineHandler(async (event) => {
  const pathParams = event.context.params?.path;

  if (!pathParams || pathParams.length < 2) {
    console.error('[PROXY] Invalid proxy request path:', pathParams);
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid proxy request. Expected format: /api/proxy/[projectId]/[port]/[...path]",
    });
  }

  const projectId = decodeURIComponent(pathParams[0]);
  const portStr = pathParams[1];
  const port = parseInt(portStr, 10);
  
  // The rest of the path segments
  const restOfPath = pathParams.slice(2).join('/');

  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing projectId",
    });
  }

  if (isNaN(port)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid port",
    });
  }

  console.log(`[PROXY] Incoming request: ${event.path} -> Project: ${projectId}, Port: ${port}, Rest: ${restOfPath}`);

  // 1. Security Check: Validate that this port belongs to this projectId
  const info = projectServerManager.getStatus(projectId);
  if (!info || info.port !== port) {
    console.error(`[PROXY] Unauthorized access attempt: projectId=${projectId}, requestedPort=${port}, actualPort=${info?.port}`);
    throw createError({
      statusCode: 403,
      statusMessage: "Unauthorized: Port mismatch or project not found",
    });
  }

  // 2. Construct the target URL
  const targetUrl = `http://127.0.0.1:${port}/${restOfPath}`;
  console.log(`[PROXY] Proxying to: ${targetUrl}`);

  try {
    // 3. Proxy the request
    return await proxyRequest(event, targetUrl);
  } catch (err: any) {
    console.error(`[PROXY] Error proxying request ${event.path} to ${targetUrl}:`, err.message);
    throw createError({
      statusCode: 502,
      statusMessage: "Bad Gateway: Failed to proxy request to internal dev server",
    });
  }
});
