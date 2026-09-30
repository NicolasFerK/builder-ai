import { defineHandler } from "nitro";
import { proxyRequest, createError } from "nitro/h3";
import { projectServerManager } from "../../services/ProjectServerManager";

export default defineHandler(async (event) => {
  const projectId = event.context.params?.projectId;
  const portStr = event.context.params?.port;
  const path = event.context.params?.path;

  if (!projectId || !portStr || !path) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing required parameters: projectId, port, or path",
    });
  }

  const port = parseInt(portStr, 10);
  if (isNaN(port)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid port",
    });
  }

  // 1. Security Check: Validate that this port belongs to this projectId
  const info = projectServerManager.getStatus(projectId);
  if (!info || info.port !== port) {
    console.error(`[PROXY] Unauthorized access attempt: projectId=${projectId}, requestedPort=${port}`);
    throw createError({
      statusCode: 403,
      statusMessage: "Unauthorized: Port mismatch or project not found",
    });
  }

  // 2. Construct the target URL
  // We proxy to the local address where Vite is listening
  const targetUrl = `http://127.0.0.1:${port}/${path || ''}`;
  
  console.log(`[PROXY] Proxying request: ${event.path} -> ${targetUrl}`);

  try {
    // 3. Proxy the request
    // proxyRequest handles the heavy lifting of streaming the response
    return await proxyRequest(event, targetUrl);
  } catch (err: any) {
    console.error(`[PROXY] Error proxying request ${event.path} to ${targetUrl}:`, err.message);
    throw createError({
      statusCode: 502,
      statusMessage: "Bad Gateway: Failed to proxy request to internal dev server",
    });
  }
});
