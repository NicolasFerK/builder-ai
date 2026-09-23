import { defineEventHandler, getQuery, createError } from 'h3';
import { projectServerManager } from '../services/ProjectServerManager';

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

  return {
    url: info.url,
    status: info.status,
  };
});
