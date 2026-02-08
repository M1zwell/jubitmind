import { Router } from 'express';
import { PATHS } from '../services/config-resolver.js';
import { readFile } from '../services/file-manager.js';
import { runCliSync } from '../services/claude-cli.js';

const router = Router();

router.get('/servers', async (_req, res) => {
  try {
    const servers: Array<Record<string, unknown>> = [];

    // Read from mcp-config.json
    try {
      const mcpRaw = await readFile(PATHS.mcpConfig);
      const mcpData = JSON.parse(mcpRaw);
      if (mcpData.mcpServers) {
        for (const [name, config] of Object.entries(mcpData.mcpServers)) {
          const c = config as Record<string, unknown>;
          servers.push({
            name,
            command: c.command,
            args: c.args || [],
            env: c.env || {},
            source: 'mcp-config',
            status: 'unknown',
          });
        }
      }
    } catch {
      // mcp-config.json doesn't exist or is invalid
    }

    // Read from settings.local.json
    try {
      const settingsRaw = await readFile(PATHS.settingsLocal);
      const settings = JSON.parse(settingsRaw);
      if (settings.mcpServers) {
        for (const [name, config] of Object.entries(settings.mcpServers)) {
          // Skip if already in mcp-config
          if (servers.some((s) => s.name === name)) continue;
          const c = config as Record<string, unknown>;
          servers.push({
            name,
            command: c.command,
            args: c.args || [],
            env: c.env || {},
            source: 'settings-local',
            status: 'unknown',
          });
        }
      }
    } catch {
      // settings.local.json doesn't exist or is invalid
    }

    res.json({ servers });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/add', (req, res) => {
  const { name, command, args, scope } = req.body;
  if (!name || !command) {
    res.status(400).json({ error: 'name and command are required' });
    return;
  }

  try {
    const cliArgs = ['mcp', 'add', name, '-s', scope || 'local', '--', command, ...(args || [])];
    runCliSync(cliArgs);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete('/:name', (req, res) => {
  const { name } = req.params;
  try {
    runCliSync(['mcp', 'remove', name]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/:name/test', (_req, res) => {
  // Placeholder: testing MCP connectivity would require spawning the server
  res.json({ status: 'unknown', message: 'MCP server testing not yet implemented' });
});

export default router;
