import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const PROJECT_ROOT = process.env.JUBITMIND_PROJECT_ROOT || os.homedir();
const HOME = os.homedir();
const IS_DEMO = process.env.DEMO_MODE === 'true';
const IS_WINDOWS = os.platform() === 'win32';

// In demo mode, point projectsDir to bundled sample sessions
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// From dist/server/services/ -> go up 3 levels to project root -> data/demo-sessions/
const DEMO_SESSIONS_DIR = path.resolve(__dirname, '..', '..', '..', 'data', 'demo-sessions');

// Resolve Claude CLI binary path based on platform
function resolveClaudeBinary(): string {
  const candidates = IS_WINDOWS
    ? [
        path.join(HOME, 'AppData', 'Roaming', 'npm', 'claude.cmd'),
        path.join(HOME, 'AppData', 'Roaming', 'npm', 'claude'),
        path.join(HOME, '.local', 'bin', 'claude.exe'),
        path.join(HOME, '.local', 'bin', 'claude'),
      ]
    : [
        path.join(HOME, '.local', 'bin', 'claude'),
        '/usr/local/bin/claude',
        '/opt/homebrew/bin/claude',
      ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  // Fallback to default
  return IS_WINDOWS
    ? path.join(HOME, 'AppData', 'Roaming', 'npm', 'claude.cmd')
    : path.join(HOME, '.local', 'bin', 'claude');
}

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
  cliBinary: resolveClaudeBinary(),
  isDemo: IS_DEMO,
};
