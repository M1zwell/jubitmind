import { Router } from 'express';
import { PATHS } from '../services/config-resolver.js';
import { readFile, writeFileWithBackup } from '../services/file-manager.js';

const router = Router();

router.get('/settings', async (_req, res) => {
  try {
    const content = await readFile(PATHS.settingsLocal);
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put('/settings', async (req, res) => {
  const { content } = req.body;
  if (!content) {
    res.status(400).json({ error: 'content is required' });
    return;
  }

  // Validate JSON
  try {
    JSON.parse(content);
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  try {
    await writeFileWithBackup(PATHS.settingsLocal, content);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/settings-global', async (_req, res) => {
  try {
    const content = await readFile(PATHS.globalSettings);
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/claude-md', async (_req, res) => {
  try {
    const content = await readFile(PATHS.claudeMd);
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put('/claude-md', async (req, res) => {
  const { content } = req.body;
  if (content === undefined) {
    res.status(400).json({ error: 'content is required' });
    return;
  }

  try {
    await writeFileWithBackup(PATHS.claudeMd, content);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/permissions', async (_req, res) => {
  try {
    const raw = await readFile(PATHS.settingsLocal);
    const settings = JSON.parse(raw);
    const allowList = settings.permissions?.allow || [];

    const permissions = allowList.map((rule: string) => {
      let category = 'other';
      let tool = rule;
      let pattern: string | undefined;
      let hasSecret = false;

      if (rule.startsWith('Bash(')) {
        category = 'bash';
        tool = 'Bash';
        pattern = rule.slice(5, -1);
      } else if (rule.startsWith('mcp__')) {
        category = 'mcp';
        const parts = rule.split('__');
        tool = parts[1] || rule;
        pattern = parts.slice(2).join('__');
      } else if (rule.startsWith('WebFetch(') || rule.startsWith('WebSearch')) {
        category = 'web';
        tool = rule.startsWith('WebFetch') ? 'WebFetch' : 'WebSearch';
        if (rule.includes('(')) pattern = rule.slice(rule.indexOf('(') + 1, -1);
      } else if (rule.startsWith('Read') || rule.startsWith('Write') || rule.startsWith('Edit') || rule.startsWith('Glob') || rule.startsWith('Grep')) {
        category = 'filesystem';
        tool = rule;
      } else if (rule.startsWith('Skill(')) {
        category = 'skill';
        tool = 'Skill';
        pattern = rule.slice(6, -1);
      }

      // Check for secrets
      if (rule.includes('sbp_') || rule.includes('eyJ') || rule.includes('sk-') || rule.includes('ghp_') || rule.includes('api_key')) {
        hasSecret = true;
      }

      return { raw: rule, category, tool, pattern, hasSecret };
    });

    res.json({ permissions });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
