import { cdpService } from '../cdp/index.js';
import type { AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';

/**
 * Check if CDP is connected AND the tool has at least one open tab.
 */
export async function isBrowserToolAvailable(toolId: string): Promise<boolean> {
  try {
    const status = cdpService.getStatus();
    if (!status.connected) return false;
    const tabs = await cdpService.getAIToolTabs();
    return tabs.some(t => t.detectedTool === toolId);
  } catch {
    return false;
  }
}

/**
 * Discover sessions from open browser tabs for a specific tool.
 * Each open tab becomes a session.
 */
export async function discoverBrowserSessions(
  adapterId: string,
  toolId: string,
): Promise<AdapterSessionMeta[]> {
  try {
    const tabs = await cdpService.getAIToolTabs();
    const toolTabs = tabs.filter(t => t.detectedTool === toolId);

    return toolTabs.map(tab => ({
      sessionId: tab.id,
      adapterId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 0, // populated on extraction
      preview: tab.title || `${toolId} conversation`,
      riskLevel: 'low' as const,
    }));
  } catch {
    return [];
  }
}

/**
 * Extract messages from a specific browser tab.
 */
export async function getBrowserMessages(
  tabId: string,
  toolId: string,
): Promise<AdapterMessage[]> {
  try {
    const conversation = await cdpService.extractConversations(tabId, toolId);
    return conversation.messages.map((msg, i) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp || conversation.extractedAt,
      uuid: `${toolId}-${tabId}-${i}`,
      sourceAdapter: `${toolId}-browser`,
      documentDate: msg.timestamp || conversation.extractedAt,
    }));
  } catch {
    return [];
  }
}

/**
 * Compute stats from browser sessions.
 */
export async function getBrowserStats(
  adapterId: string,
  toolId: string,
): Promise<AdapterStats> {
  const sessions = await discoverBrowserSessions(adapterId, toolId);
  return {
    totalSessions: sessions.length,
    totalMessages: sessions.reduce((sum, s) => sum + s.messageCount, 0),
  };
}
