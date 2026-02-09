import { Router } from 'express';
import { PATHS } from '../services/config-resolver.js';
import { runCliSync } from '../services/claude-cli.js';

const router = Router();

router.get('/health', (_req, res) => {
  try {
    const cliVersion = runCliSync(['--version']);
    res.json({
      cliVersion,
      nodeVersion: process.version,
      platform: `${process.platform} ${process.arch}`,
      projectRoot: PATHS.projectRoot,
      claudeDir: PATHS.claudeDir,
      cliBinary: PATHS.cliBinary,
    });
  } catch (err) {
    res.json({
      cliVersion: 'unavailable',
      nodeVersion: process.version,
      platform: `${process.platform} ${process.arch}`,
      projectRoot: PATHS.projectRoot,
      claudeDir: PATHS.claudeDir,
      error: (err as Error).message,
    });
  }
});

router.get('/plugins/list', (_req, res) => {
  try {
    const output = runCliSync(['plugin', 'list']);
    // Parse plugin list output
    const plugins = output.split('\n')
      .map((line) => line.trim())
      .filter((line) => line && /\((enabled|disabled)\)/.test(line))
      .map((line) => {
        const enabled = !line.includes('disabled');
        const name = line.replace(/\s*\(.*\)/, '').trim();
        return { name, enabled };
      });
    res.json({ plugins });
  } catch {
    res.json({ plugins: [] });
  }
});

export default router;
