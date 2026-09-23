import { defineEventHandler, readBody } from 'h3';
import fs from 'fs/promises';
import path from 'path';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { files } = body;

  try {
    for (const file of files) {
      const filePath = path.join(process.cwd(), file.path);
      const dirPath = path.dirname(filePath);
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(filePath, file.content, 'utf-8');
    }
    return { success: true };
  } catch (error) {
    console.error('Failed to write files:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to write files to filesystem',
    });
  }
});
