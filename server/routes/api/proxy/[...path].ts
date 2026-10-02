import { defineHandler } from "nitro";
import { proxyRequest, createError } from "nitro/h3";
import { projectServerManager } from "../../../services/ProjectServerManager";

export default defineHandler(async (event) => {
  const pathParam = event.context.params?.path;

  if (!pathParam) {
    console.error('[PROXY] No path provided in params');
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid proxy request. Missing path parameter.",
    });
  }

  const segments = typeof pathParam === 'string' ? pathParam.split('/') : pathParam;

  if (segments.length < 2) {
    console.error('[PROXY] Invalid proxy request path segments:', segments);
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid proxy request. Expected format: /api/proxy/[projectId]/[port]/[...path]",
    });
  }

  const projectId = decodeURIComponent(segments[0]);
  const portStr = segments[1].startsWith('p-') ? segments[1].substring(2) : segments[1];
  const port = parseInt(portStr, 10);
  
  // The rest of the path segments
  const restOfPath = segments.slice(2).join('/');

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
  
  console.log(`[PROXY-DEBUG] Project info for ${projectId}:`, JSON.stringify(info, (key, value) => key === 'process' ? undefined : value));

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
    console.error('[PROXY-DEBUG] Error details:', err);
    throw createError({
      statusCode: 502,
      statusMessage: `Bad Gateway: ${err.message}`,
    });
  }
});
