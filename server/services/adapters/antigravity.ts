import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { homedir, platform } from 'os';
import { join, extname, basename } from 'path';
import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';

const IS_WINDOWS = platform() === 'win32';
const HOME = homedir();

// Antigravity stores conversation data in .gemini/antigravity/conversations/
// Files are .pb (Protocol Buffer) but are ENCRYPTED with per-file keys
// Analysis shows: max entropy (8.0), no compression headers, unique magic bytes per file
// Message content cannot be read without Google account decryption keys
//
// HOWEVER: The brain/ directory contains UNENCRYPTED artifacts:
// - Implementation plans (.md)
// - Task lists (.md)
// - Screenshots (.png, .webp)
// - Metadata (.metadata.json)
const CONVERSATIONS_PATH = join(HOME, '.gemini', 'antigravity', 'conversations');
const BRAIN_PATH = join(HOME, '.gemini', 'antigravity', 'brain');

const DATA_PATHS = [
  CONVERSATIONS_PATH,
  BRAIN_PATH,
  join(HOME, '.antigravity'),
  ...(IS_WINDOWS
    ? [
        join(HOME, 'AppData', 'Roaming', 'antigravity'),
        join(HOME, 'AppData', 'Local', 'antigravity'),
      ]
    : [join(HOME, '.config', 'antigravity')]),
];

// Artifact type labels for display
const ARTIFACT_LABELS: Record<string, string> = {
  'ARTIFACT_TYPE_IMPLEMENTATION_PLAN': 'Implementation Plan',
  'ARTIFACT_TYPE_TASK': 'Task List',
  'ARTIFACT_TYPE_ANALYSIS': 'Analysis',
  'ARTIFACT_TYPE_CODE': 'Code',
  'ARTIFACT_TYPE_DOCUMENT': 'Document',
};

interface BrainMetadata {
  artifactType: string;
  summary: string;
  updatedAt: string;
  version: string;
}

interface BrainArtifact {
  name: string;
  type: string;
  summary: string;
  content: string;
  updatedAt: string;
  isImage: boolean;
  sizeBytes: number;
}

/**
 * Parse brain artifacts for a session
 */
function getBrainArtifacts(sessionId: string): BrainArtifact[] {
  const sessionBrainPath = join(BRAIN_PATH, sessionId);
  if (!existsSync(sessionBrainPath)) {
    return [];
  }

  const artifacts: BrainArtifact[] = [];

  try {
    const files = readdirSync(sessionBrainPath);
    const mdFiles = files.filter(f => f.endsWith('.md') && !f.includes('.resolved'));
    const imageFiles = files.filter(f => /\.(png|webp|jpg|jpeg|gif)$/i.test(f));

    // Process markdown files with metadata
    for (const mdFile of mdFiles) {
      const mdPath = join(sessionBrainPath, mdFile);
      const metaPath = join(sessionBrainPath, `${mdFile}.metadata.json`);

      try {
        const content = readFileSync(mdPath, 'utf8');
        const stat = statSync(mdPath);
        let metadata: BrainMetadata | null = null;

        if (existsSync(metaPath)) {
          try {
            metadata = JSON.parse(readFileSync(metaPath, 'utf8'));
          } catch {
            // Ignore JSON parse errors
          }
        }

        const artifactType = metadata?.artifactType || 'ARTIFACT_TYPE_DOCUMENT';
        artifacts.push({
          name: mdFile.replace('.md', ''),
          type: ARTIFACT_LABELS[artifactType] || artifactType.replace('ARTIFACT_TYPE_', ''),
          summary: metadata?.summary || content.slice(0, 100).split('\n')[0],
          content,
          updatedAt: metadata?.updatedAt || stat.mtime.toISOString(),
          isImage: false,
          sizeBytes: stat.size,
        });
      } catch {
        // Skip files we can't read
      }
    }

    // Process image files
    for (const imageFile of imageFiles) {
      const imagePath = join(sessionBrainPath, imageFile);
      try {
        const stat = statSync(imagePath);
        const sizeKB = Math.round(stat.size / 1024);

        artifacts.push({
          name: imageFile,
          type: 'Screenshot',
          summary: `Image: ${imageFile} (${sizeKB} KB)`,
          content: `[Image: ${imageFile}]\nPath: ${imagePath}\nSize: ${sizeKB} KB`,
          updatedAt: stat.mtime.toISOString(),
          isImage: true,
          sizeBytes: stat.size,
        });
      } catch {
        // Skip files we can't stat
      }
    }

    // Sort by update time (newest first)
    artifacts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch {
    // Directory read failed
  }

  return artifacts;
}

/**
 * Get a preview from brain artifacts
 */
function getSessionPreview(sessionId: string, conversationSizeKB: number): string {
  const artifacts = getBrainArtifacts(sessionId);

  if (artifacts.length === 0) {
    return `Gemini conversation (${conversationSizeKB >= 1024 ? (conversationSizeKB / 1024).toFixed(1) + ' MB' : conversationSizeKB + ' KB'}, encrypted)`;
  }

  // Find the first non-image artifact for preview
  const textArtifact = artifacts.find(a => !a.isImage);
  if (textArtifact) {
    const typeLabel = textArtifact.type;
    const preview = textArtifact.summary.slice(0, 60);
    return `${typeLabel}: ${preview}${textArtifact.summary.length > 60 ? '...' : ''}`;
  }

  // Fall back to artifact count
  const imageCount = artifacts.filter(a => a.isImage).length;
  const docCount = artifacts.filter(a => !a.isImage).length;
  return `${docCount} documents, ${imageCount} screenshots`;
}

export const antigravityAdapter: AIToolAdapter = {
  id: 'antigravity',
  name: 'Antigravity',
  icon: 'Rocket',
  category: 'cli',
  description: 'Antigravity AI agent sessions (Gemini-powered) - brain artifacts readable, conversations encrypted',

  async isAvailable(): Promise<boolean> {
    return DATA_PATHS.some((p) => existsSync(p));
  },

  async discoverSessions(): Promise<AdapterSessionMeta[]> {
    // Check if conversations directory exists
    if (!existsSync(CONVERSATIONS_PATH)) {
      return [];
    }

    try {
      const files = readdirSync(CONVERSATIONS_PATH).filter((f) => f.endsWith('.pb'));
      const sessions: AdapterSessionMeta[] = [];

      for (const file of files) {
        const filePath = join(CONVERSATIONS_PATH, file);
        try {
          const stat = statSync(filePath);
          const sessionId = file.replace('.pb', '');
          const sizeKB = Math.round(stat.size / 1024);

          // Get brain artifacts for this session
          const artifacts = getBrainArtifacts(sessionId);
          const artifactCount = artifacts.length;
          const hasReadableContent = artifactCount > 0;

          // Get preview from brain artifacts if available
          const preview = getSessionPreview(sessionId, sizeKB);

          sessions.push({
            sessionId,
            adapterId: 'antigravity',
            createdAt: stat.birthtime.toISOString(),
            updatedAt: stat.mtime.toISOString(),
            messageCount: artifactCount, // Count of readable artifacts
            preview,
            sizeBytes: stat.size,
            riskLevel: hasReadableContent ? 'low' : undefined,
          });
        } catch {
          // Skip files we can't stat
        }
      }

      // Sort by most recent first
      sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      return sessions;
    } catch {
      return [];
    }
  },

  async getMessages(sessionId: string): Promise<AdapterMessage[]> {
    const messages: AdapterMessage[] = [];
    const filePath = join(CONVERSATIONS_PATH, `${sessionId}.pb`);

    // Get brain artifacts (readable content)
    const artifacts = getBrainArtifacts(sessionId);

    for (const artifact of artifacts) {
      if (!artifact.isImage) {
        // Add document artifacts as assistant messages (they're AI-generated)
        messages.push({
          uuid: `${sessionId}-${artifact.name}`,
          role: 'assistant',
          content: `## ${artifact.type}: ${artifact.name}\n\n${artifact.content}`,
          timestamp: artifact.updatedAt,
        });
      } else {
        // Add image references
        messages.push({
          uuid: `${sessionId}-${artifact.name}`,
          role: 'assistant',
          content: `📷 **${artifact.type}**: ${artifact.name}\n\n${artifact.content}`,
          timestamp: artifact.updatedAt,
        });
      }
    }

    // Add info about encrypted conversation if it exists
    if (existsSync(filePath)) {
      const stat = statSync(filePath);
      const sizeKB = Math.round(stat.size / 1024);
      const sizeDisplay = sizeKB >= 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

      messages.push({
        uuid: `${sessionId}-encrypted-conversation`,
        role: 'system',
        content: `---\n\n**Note:** The full conversation transcript (${sizeDisplay}) is encrypted and cannot be read locally.\n\nAntigravity encrypts .pb files with per-session keys tied to your Google account. The artifacts above were extracted from the unencrypted brain/ directory.`,
        timestamp: stat.mtime.toISOString(),
      });
    }

    // Sort by timestamp (oldest first for reading order)
    messages.sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());

    return messages;
  },

  async getStats(): Promise<AdapterStats> {
    const sessions = await this.discoverSessions();
    let totalSize = 0;
    let totalArtifacts = 0;
    let oldest: string | undefined;
    let newest: string | undefined;

    for (const s of sessions) {
      totalSize += s.sizeBytes || 0;
      totalArtifacts += s.messageCount || 0;
      if (!oldest || s.createdAt < oldest) oldest = s.createdAt;
      if (!newest || s.updatedAt > newest) newest = s.updatedAt;
    }

    return {
      totalSessions: sessions.length,
      totalMessages: totalArtifacts, // Now counts readable artifacts
      oldestSession: oldest,
      newestSession: newest,
    };
  },
};
