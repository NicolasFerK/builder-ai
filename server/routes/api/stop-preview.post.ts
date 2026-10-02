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
    await projectServerManager.stop(projectId);
    return {
      success: true,
      projectId,
    };
  } catch (error: any) {
    console.error('[PREVIEW] Failed to stop preview:', error);
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to stop preview',
    });
  }
});
