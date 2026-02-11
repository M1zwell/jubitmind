import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const PROJECT_ROOT = path.resolve('/Users/jubit_nb0/JubitLLMNPMPlayground');
const HOME = os.homedir();
const IS_DEMO = process.env.DEMO_MODE === 'true';

// In demo mode, point projectsDir to bundled sample sessions
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// From dist/server/services/ -> go up 3 levels to project root -> data/demo-sessions/
const DEMO_SESSIONS_DIR = path.resolve(__dirname, '..', '..', '..', 'data', 'demo-sessions');

export const PATHS = {
  projectRoot: PROJECT_ROOT,
  claudeDir: path.join(PROJECT_ROOT, '.claude'),
  settingsLocal: path.join(PROJECT_ROOT, '.claude', 'settings.local.json'),
  mcpConfig: path.join(PROJECT_ROOT, '.claude', 'mcp-config.json'),
  claudeMd: path.join(PROJECT_ROOT, 'CLAUDE.md'),
  skillsDir: path.join(PROJECT_ROOT, '.claude', 'skills'),
  commandsDir: path.join(PROJECT_ROOT, '.claude', 'commands'),
  globalSettings: path.join(HOME, '.claude', 'settings.json'),
  projectsDir: IS_DEMO ? DEMO_SESSIONS_DIR : path.join(HOME, '.claude', 'projects'),
  cliBinary: path.join(HOME, '.local', 'bin', 'claude'),
  isDemo: IS_DEMO,
};
