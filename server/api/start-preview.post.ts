import { defineEventHandler, readBody, createError } from 'h3';
import { projectServerManager } from '../services/ProjectServerManager';

export default defineEventHandler(async (event) => {
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
    return {
      success: true,
      projectId,
      port: info.port,
      url: info.url,
      status: info.status,
    };
  } catch (error: any) {
    console.error('Failed to start preview:', error);
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to start preview',
    });
  }
});
