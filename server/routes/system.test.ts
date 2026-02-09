import { describe, it, expect } from 'vitest';

/**
 * Bug: The plugin list parser in system.ts treats every non-empty line
 * from `claude plugin list` output as a plugin, including CLI metadata
 * lines like "Version: 1.0.0" and "Scope: user". When these appear
 * twice in the output (once per scope), the resulting plugin list
 * contains duplicates, causing React duplicate key warnings.
 */

// Extract the parsing logic so we can test it directly
// This mirrors the implementation in system.ts
function parsePluginOutput(output: string): Array<{ name: string; enabled: boolean }> {
  const plugins = output.split('\n')
    .map((line) => line.trim())
    .filter((line) => line && /\((enabled|disabled)\)/.test(line))
    .map((line) => {
      const enabled = !line.includes('disabled');
      const name = line.replace(/\s*\(.*\)/, '').trim();
      return { name, enabled };
    });
  return plugins;
}

// Realistic CLI output with metadata headers repeated per scope
const CLI_OUTPUT_WITH_METADATA = `@anthropic-ai/claude-code
Version: 1.0.0
Scope: user

Installed plugins:
  mcp-server-fetch (enabled)
  mcp-server-github (disabled)

Local plugins:
Version: 1.0.0
Scope: user
  mcp-server-filesystem (enabled)`;

// Clean output with only plugin entries
const CLEAN_CLI_OUTPUT = `mcp-server-fetch (enabled)
mcp-server-github (disabled)
mcp-server-filesystem (enabled)`;

describe('Plugin list parser', () => {
  it('should not produce duplicate plugin names from CLI metadata lines', () => {
    const plugins = parsePluginOutput(CLI_OUTPUT_WITH_METADATA);
    const names = plugins.map((p) => p.name);
    const uniqueNames = new Set(names);

    // Every name should be unique — no duplicates for React keys
    expect(names.length).toBe(uniqueNames.size);
  });

  it('should not include CLI metadata lines as plugin names', () => {
    const plugins = parsePluginOutput(CLI_OUTPUT_WITH_METADATA);
    const names = plugins.map((p) => p.name);

    // These metadata lines should NOT appear as plugin names
    expect(names).not.toContain('Version: 1.0.0');
    expect(names).not.toContain('Scope: user');
    expect(names).not.toContain('@anthropic-ai/claude-code');
    expect(names).not.toContain('Installed plugins:');
    expect(names).not.toContain('Local plugins:');
  });

  it('should correctly parse actual plugin entries', () => {
    const plugins = parsePluginOutput(CLI_OUTPUT_WITH_METADATA);
    const names = plugins.map((p) => p.name);

    expect(names).toContain('mcp-server-fetch');
    expect(names).toContain('mcp-server-github');
    expect(names).toContain('mcp-server-filesystem');
  });

  it('should correctly detect enabled/disabled status', () => {
    const plugins = parsePluginOutput(CLI_OUTPUT_WITH_METADATA);
    const byName = Object.fromEntries(plugins.map((p) => [p.name, p.enabled]));

    expect(byName['mcp-server-fetch']).toBe(true);
    expect(byName['mcp-server-github']).toBe(false);
    expect(byName['mcp-server-filesystem']).toBe(true);
  });

  it('should handle clean output with only plugin lines', () => {
    const plugins = parsePluginOutput(CLEAN_CLI_OUTPUT);
    expect(plugins).toHaveLength(3);
    expect(plugins[0]).toEqual({ name: 'mcp-server-fetch', enabled: true });
    expect(plugins[1]).toEqual({ name: 'mcp-server-github', enabled: false });
    expect(plugins[2]).toEqual({ name: 'mcp-server-filesystem', enabled: true });
  });

  it('should handle empty output', () => {
    const plugins = parsePluginOutput('');
    expect(plugins).toHaveLength(0);
  });
});
