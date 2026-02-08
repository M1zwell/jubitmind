import path from 'path';
import os from 'os';

const PROJECT_ROOT = path.resolve('/Users/jubit_nb0/JubitLLMNPMPlayground');
const HOME = os.homedir();

export const PATHS = {
  projectRoot: PROJECT_ROOT,
  claudeDir: path.join(PROJECT_ROOT, '.claude'),
  settingsLocal: path.join(PROJECT_ROOT, '.claude', 'settings.local.json'),
  mcpConfig: path.join(PROJECT_ROOT, '.claude', 'mcp-config.json'),
  claudeMd: path.join(PROJECT_ROOT, 'CLAUDE.md'),
  skillsDir: path.join(PROJECT_ROOT, '.claude', 'skills'),
  commandsDir: path.join(PROJECT_ROOT, '.claude', 'commands'),
  globalSettings: path.join(HOME, '.claude', 'settings.json'),
  projectsDir: path.join(HOME, '.claude', 'projects'),
  cliBinary: path.join(HOME, '.local', 'bin', 'claude'),
};
