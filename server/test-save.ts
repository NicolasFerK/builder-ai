import fs from 'fs/promises';
import path from 'path';

const testFile = path.join(process.cwd(), 'server', 'test-config.json');

export default async () => {
  try {
    const testData = { test: true };
    await fs.mkdir(path.dirname(testFile), { recursive: true });
    await fs.writeFile(testFile, JSON.stringify(testData, null, 2), 'utf-8');
    const content = await fs.readFile(testFile, 'utf-8');
    return { success: true, content: JSON.parse(content) };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};
