import fs from 'fs/promises';
import path from 'path';

export async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}

export async function writeFileWithBackup(filePath: string, content: string): Promise<void> {
  // Create backup
  try {
    const existing = await fs.readFile(filePath, 'utf-8');
    await fs.writeFile(`${filePath}.bak`, existing, 'utf-8');
  } catch {
    // File doesn't exist yet — no backup needed
  }

  // Atomic write: write to temp then rename
  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, content, 'utf-8');
  await fs.rename(tmpPath, filePath);
}

export async function listDirectory(dirPath: string): Promise<Array<{ name: string; type: 'file' | 'directory' }>> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((e) => !e.name.startsWith('.'))
      .map((e) => ({ name: e.name, type: e.isDirectory() ? 'directory' as const : 'file' as const }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  } catch {
    return [];
  }
}

export async function buildTree(dirPath: string, basePath = ''): Promise<Array<{ name: string; path: string; type: 'file' | 'directory'; children?: unknown[] }>> {
  const entries = await listDirectory(dirPath);
  const result = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;

    if (entry.type === 'directory') {
      const children = await buildTree(fullPath, relativePath);
      result.push({ name: entry.name, path: relativePath, type: 'directory' as const, children });
    } else {
      result.push({ name: entry.name, path: relativePath, type: 'file' as const });
    }
  }

  return result;
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
