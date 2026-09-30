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
    return {
      success: true,
      projectId,
      port: info.port,
      url: info.url,
      status: info.status,
    };
  } catch (error: any) {
    console.error('Failed to restart preview:', error);
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to restart preview',
    });
  }
});
