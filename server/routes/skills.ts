import { Router } from 'express';
import path from 'path';
import { PATHS } from '../services/config-resolver.js';
import { readFile, listDirectory, buildTree, fileExists } from '../services/file-manager.js';

const router = Router();

router.get('/list', async (_req, res) => {
  try {
    const entries = await listDirectory(PATHS.skillsDir);
    const skills = [];

    for (const entry of entries) {
      if (entry.type !== 'directory') continue;

      const skillDir = path.join(PATHS.skillsDir, entry.name);
      const skill: Record<string, unknown> = { name: entry.name, path: skillDir };

      // Try to read metadata.json
      const metaPath = path.join(skillDir, 'metadata.json');
      if (await fileExists(metaPath)) {
        try {
          const meta = JSON.parse(await readFile(metaPath));
          skill.displayName = meta.display_name || meta.name;
          skill.description = meta.description;
          skill.version = meta.version;
          skill.metadata = meta;
        } catch {
          // Skip invalid metadata
        }
      }

      skills.push(skill);
    }

    res.json({ skills });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/:name', async (req, res) => {
  const { name } = req.params;
  const skillDir = path.join(PATHS.skillsDir, name);

  try {
    const skill: Record<string, unknown> = { name };

    // Read skill.md
    const skillMdPath = path.join(skillDir, 'skill.md');
    if (await fileExists(skillMdPath)) {
      skill.content = await readFile(skillMdPath);
    }

    // Read metadata.json
    const metaPath = path.join(skillDir, 'metadata.json');
    if (await fileExists(metaPath)) {
      try {
        skill.metadata = JSON.parse(await readFile(metaPath));
      } catch {
        // Skip invalid metadata
      }
    }

    // Read README.md if exists
    const readmePath = path.join(skillDir, 'README.md');
    if (await fileExists(readmePath)) {
      skill.readme = await readFile(readmePath);
    }

    res.json({ skill });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Commands routes
router.get('/commands/tree', async (_req, res) => {
  try {
    const tree = await buildTree(PATHS.commandsDir);
    res.json({ tree });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/commands/*', async (req, res) => {
  const relativePath = req.params[0];
  if (!relativePath) {
    res.status(400).json({ error: 'path is required' });
    return;
  }

  const filePath = path.join(PATHS.commandsDir, relativePath);

  // Security: ensure path stays within commandsDir
  if (!filePath.startsWith(PATHS.commandsDir)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  try {
    const content = await readFile(filePath);
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
