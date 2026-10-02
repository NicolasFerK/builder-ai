import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import fs from 'fs/promises';
import path from 'path';

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
  console.log(`[REAL-APPLY] SERVER PROJECT ROOT: ${path.join(process.cwd(), "projects", projectId)}`);
  console.log(`[REAL-APPLY] SERVER FILE PATHS: ${JSON.stringify(files.map((f: any) => f.path))}`);

  const projectsRoot = path.join(process.cwd(), 'projects');
  const projectDir = path.join(projectsRoot, projectId);

  try {
    for (const file of files) {
      // Prevent path traversal
      const sanitizedPath = path.normalize(file.path).replace(/^(\\\.\\.(\/|\\|$))+/, '');
      const filePath = path.join(projectDir, sanitizedPath);
      
      // Double check that the filePath is still within projectDir
      if (!filePath.startsWith(projectDir)) {
        throw new Error(`Attempted path traversal: ${file.path}`);
      }

      const dirPath = path.dirname(filePath);
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(filePath, file.content, 'utf-8');
    }
    
    console.log(`[REAL-APPLY] FILES WRITTEN: ${JSON.stringify(files.map((f: any) => f.path))}`);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to write files:', error);
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to write files to filesystem',
    });
  }
});
