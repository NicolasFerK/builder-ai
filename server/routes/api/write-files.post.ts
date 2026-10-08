import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { projectServerManager } from "../../services/ProjectServerManager";

export default defineHandler(async (event) => {
  const body = await readBody(event);
  const { files, projectId } = body ?? {};

  if (typeof projectId !== "string" || !projectId.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "projectId is required",
    });
  }

  if (!Array.isArray(files)) {
    throw createError({
      statusCode: 400,
      statusMessage: "files must be an array",
    });
  }

  for (const file of files) {
    if (
      !file ||
      typeof file.path !== "string" ||
      !file.path.trim() ||
      typeof file.content !== "string"
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: "Each file must contain a path and string content",
      });
    }
  }

  console.log(`[REAL-APPLY] SERVER PROJECT ID: ${projectId}`);
  console.log(`[REAL-APPLY] SERVER FILE PATHS: ${JSON.stringify(files.map((f: any) => f.path))}`);

  try {
    // Instead of just writing files, we use applyCode which also builds and restarts the preview
    await projectServerManager.applyCode(projectId, files);
    
    console.log(`[REAL-APPLY] SERVER APPLY SUCCESS: ${projectId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to apply code:', error);
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to apply code to project',
    });
  }
});
