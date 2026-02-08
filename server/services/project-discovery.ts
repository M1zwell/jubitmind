import fsp from 'fs/promises';
import path from 'path';
import os from 'os';
import { PATHS } from './config-resolver.js';

export interface ProjectInfo {
  slug: string;
  displayName: string;
  fullPath: string;
  originalPath: string;
  sessionCount: number;
  totalSizeBytes: number;
  lastActivity: string;
}

// Cache with TTL
let cachedProjects: ProjectInfo[] = [];
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000;

// Compute the home directory prefix as it appears in slugs
// HOME=/Users/jubit_nb0 => slug prefix is "-Users-jubit-nb0-"
// Claude Code CLI replaces both "/" and "_" with "-" when encoding paths
const HOME_SLUG_PREFIX = os.homedir().replace(/[/_]/g, '-') + '-';

/**
 * Convert a mangled directory name back to a human-readable project name.
 * e.g. "-Users-jubit-nb0-JubitLLMNPMPlayground" => "JubitLLMNPMPlayground"
 *      "-Users-jubit-nb0-jubit-ai-universe" => "jubit-ai-universe"
 *      "-Users-jubit-nb0-JubitLLMNPMPlayground-zaydenclips" => "JubitLLMNPMPlayground/zaydenclips"
 *      "-" => "(root)"
 *      "-private-tmp" => "/private/tmp"
 */
export function slugToDisplayName(slug: string): string {
  if (slug === '-') return '(root)';

  // Strip the home directory prefix to get the project-relative path
  // e.g. "-Users-jubit-nb0-JubitLLMNPMPlayground" => "JubitLLMNPMPlayground"
  const withoutLeadingDash = slug.startsWith('-') ? slug.slice(1) : slug;

  if (withoutLeadingDash.startsWith(HOME_SLUG_PREFIX.slice(1))) {
    const remainder = withoutLeadingDash.slice(HOME_SLUG_PREFIX.length - 1);
    if (remainder) {
      // Try to reconstruct meaningful segments
      // We know common project names, so just return the remainder as-is
      // It preserves hyphens which were either "/" separators or original hyphens
      return remainder;
    }
  }

  // For paths outside home (e.g., "-private-tmp")
  return withoutLeadingDash;
}

/**
 * Resolve the original filesystem path from a slug.
 * e.g. "-Users-jubit-nb0-JubitLLMNPMPlayground" => "/Users/jubit_nb0/JubitLLMNPMPlayground"
 * Note: This is approximate since hyphens in the original path are ambiguous.
 */
export function slugToOriginalPath(slug: string): string {
  if (slug === '-') return '/';
  // The slug is the path with "/" replaced by "-", but we can't perfectly reverse it
  // since original paths may contain hyphens. Best effort: check if the path exists.
  // For now, just use the display name as context.
  return slug.replace(/^-/, '/').replace(/-/g, '/');
}

export async function discoverProjects(): Promise<ProjectInfo[]> {
  const now = Date.now();
  if (cachedProjects.length > 0 && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedProjects;
  }

  const projectsDir = PATHS.projectsDir;
  let entries: string[];
  try {
    entries = await fsp.readdir(projectsDir);
  } catch {
    return [];
  }

  const projects: ProjectInfo[] = [];

  // Process projects in parallel (limit concurrency to 5)
  const chunks: string[][] = [];
  for (let i = 0; i < entries.length; i += 5) {
    chunks.push(entries.slice(i, i + 5));
  }

  for (const chunk of chunks) {
    const results = await Promise.all(
      chunk.map(async (entry): Promise<ProjectInfo | null> => {
        // Skip hidden files and the "." entry
        if (!entry.startsWith('-')) return null;

        const fullPath = path.join(projectsDir, entry);
        try {
          const stat = await fsp.stat(fullPath);
          if (!stat.isDirectory()) return null;

          // Count .jsonl files and compute total size
          const files = await fsp.readdir(fullPath);
          const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'));

          let totalSize = 0;
          let latestMtime = 0;

          // Stat all jsonl files to get size and latest modification
          const fileStats = await Promise.all(
            jsonlFiles.map(async (f) => {
              try {
                const s = await fsp.stat(path.join(fullPath, f));
                return { size: s.size, mtimeMs: s.mtimeMs };
              } catch {
                return { size: 0, mtimeMs: 0 };
              }
            }),
          );

          for (const fs of fileStats) {
            totalSize += fs.size;
            if (fs.mtimeMs > latestMtime) latestMtime = fs.mtimeMs;
          }

          return {
            slug: entry,
            displayName: slugToDisplayName(entry),
            fullPath,
            originalPath: slugToOriginalPath(entry),
            sessionCount: jsonlFiles.length,
            totalSizeBytes: totalSize,
            lastActivity: latestMtime > 0 ? new Date(latestMtime).toISOString() : stat.mtime.toISOString(),
          };
        } catch {
          return null;
        }
      }),
    );

    for (const r of results) {
      if (r && r.sessionCount > 0) projects.push(r);
    }
  }

  // Sort by last activity descending
  projects.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());

  cachedProjects = projects;
  cacheTimestamp = now;
  return projects;
}

export function getProjectBySlug(slug: string): ProjectInfo | undefined {
  return cachedProjects.find((p) => p.slug === slug);
}

export function refreshProjectCache(): void {
  cacheTimestamp = 0;
}
