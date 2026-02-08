import { Router } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { PATHS } from '../services/config-resolver.js';
import { readFile, writeFileWithBackup, fileExists } from '../services/file-manager.js';

const router = Router();

router.get('/projects', async (_req, res) => {
  try {
    const entries = await fs.readdir(PATHS.projectsDir, { withFileTypes: true });
    const projects = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const projectDir = path.join(PATHS.projectsDir, entry.name);
      const memoryDir = path.join(projectDir, 'memory');
      const memoryFile = path.join(memoryDir, 'MEMORY.md');
      const hasMemory = await fileExists(memoryFile);

      projects.push({
        name: entry.name,
        path: projectDir,
        hasMemory,
      });
    }

    res.json({ projects });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/:project', async (req, res) => {
  const { project } = req.params;
  const memoryFile = path.join(PATHS.projectsDir, project, 'memory', 'MEMORY.md');

  // Security: ensure path stays within projectsDir
  if (!memoryFile.startsWith(PATHS.projectsDir)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  try {
    if (await fileExists(memoryFile)) {
      const content = await readFile(memoryFile);
      res.json({ content });
    } else {
      res.json({ content: '' });
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put('/:project', async (req, res) => {
  const { project } = req.params;
  const { content } = req.body;

  if (content === undefined) {
    res.status(400).json({ error: 'content is required' });
    return;
  }

  const memoryDir = path.join(PATHS.projectsDir, project, 'memory');
  const memoryFile = path.join(memoryDir, 'MEMORY.md');

  // Security: ensure path stays within projectsDir
  if (!memoryFile.startsWith(PATHS.projectsDir)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  try {
    // Ensure memory directory exists
    await fs.mkdir(memoryDir, { recursive: true });
    await writeFileWithBackup(memoryFile, content);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
