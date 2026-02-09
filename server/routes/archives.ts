import { Router } from 'express';
import { supabase, isSupabaseConfigured } from '../services/supabase.js';
import { optionalAuth, requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { getAllSessions as getLocalSessions } from '../services/session-cache.js';

const router = Router();

interface UnifiedArchiveItem {
  id: string;
  source: 'supabase-room' | 'supabase-chat' | 'local-claude';
  title: string;
  preview: string;
  messageCount: number;
  participants?: string[];
  models?: string[];
  createdAt: string;
  endedAt?: string;
  riskLevel?: string;
  riskScore?: number;
  upvotes?: number;
  tags?: string[];
  userId?: string;
  project?: string;
  productType?: string;
  visibility?: string;
  arenaMetadata?: Record<string, unknown>;
  summary?: string;
}

// GET /api/archives - List unified archives
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const source = (req.query.source as string) || 'all';
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const search = (req.query.search as string) || '';
    const productType = (req.query.productType as string) || undefined;
    const visibility = (req.query.visibility as string) || undefined;

    const items: UnifiedArchiveItem[] = [];
    const hasAuth = !!req.user;
    console.log(`[Archives] GET / source=${source} auth=${hasAuth} user=${req.user?.email || 'anon'}`);

    // Fetch Supabase archives if user is authenticated and Supabase is configured
    // Filter by user_id + public rooms (pagination applied after combining with local)
    if (isSupabaseConfigured() && req.user && (source === 'all' || source === 'supabase')) {
      const supabaseItems = await fetchSupabaseArchives(search, req.user.id, productType, visibility);
      items.push(...supabaseItems);
    }

    // Fetch local Claude Code sessions
    if (source === 'all' || source === 'local') {
      const localItems = await fetchLocalSessions(search);
      items.push(...localItems);
    }

    // Sort by date descending
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply pagination to combined results
    const paginated = items.slice(offset, offset + limit);

    res.json({ items: paginated, total: items.length, offset, limit });
  } catch (err) {
    console.error('[Archives] List error:', err);
    res.status(500).json({ error: 'Failed to fetch archives' });
  }
});

// GET /api/archives/stats - Aggregate stats
router.get('/stats', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const stats: Record<string, unknown> = {
      local: { sessions: 0 },
      supabase: { rooms: 0, chats: 0 },
    };

    // Local stats
    const localSessions = await getLocalSessions();
    stats.local = { sessions: localSessions.length };

    // Supabase stats - scoped to this user's archives + public
    if (isSupabaseConfigured() && req.user && supabase) {
      const userId = req.user.id;
      const [roomCount, chatCount, typeBreakdown] = await Promise.all([
        supabase.from('archived_conversations').select('id', { count: 'exact', head: true })
          .or(`user_id.eq.${userId},is_public.eq.true`)
          .is('deleted_at', null),
        supabase.from('chat_sessions').select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase.from('archived_conversations').select('product_type')
          .or(`user_id.eq.${userId},is_public.eq.true`)
          .is('deleted_at', null),
      ]);
      const byType: Record<string, number> = {};
      if (typeBreakdown.data) {
        for (const row of typeBreakdown.data) {
          const pt = (row.product_type as string) || 'unknown';
          byType[pt] = (byType[pt] || 0) + 1;
        }
      }
      stats.supabase = {
        rooms: roomCount.count || 0,
        chats: chatCount.count || 0,
        byType,
      };
    }

    res.json({ stats });
  } catch (err) {
    console.error('[Archives] Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/archives/analytics - Rich analytics aggregation
router.get('/analytics', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const result = {
      modelUsage: {} as Record<string, number>,
      typeDistribution: {} as Record<string, number>,
      activityTimeline: [] as Array<{ date: string; count: number }>,
      riskDistribution: { critical: 0, high: 0, medium: 0, low: 0 },
      costEstimate: { totalCents: 0, arenaCount: 0 },
      topModels: [] as Array<{ model: string; wins: number; appearances: number }>,
      totalArchives: 0,
      totalLocal: 0,
    };

    // Local session analytics
    const localSessions = await getLocalSessions();
    result.totalLocal = localSessions.length;
    for (const s of localSessions) {
      const rl = (s as Record<string, unknown>).riskLevel as string;
      if (rl && rl in result.riskDistribution) {
        result.riskDistribution[rl as keyof typeof result.riskDistribution]++;
      }
    }

    // Supabase analytics
    if (isSupabaseConfigured() && req.user && supabase) {
      const userId = req.user.id;
      const { data: rooms } = await supabase
        .from('archived_conversations')
        .select('product_type, participants, arena_metadata, created_at')
        .or(`user_id.eq.${userId},is_public.eq.true`)
        .is('deleted_at', null);

      if (rooms) {
        result.totalArchives = rooms.length;
        const modelWins: Record<string, number> = {};
        const modelAppearances: Record<string, number> = {};
        const dateMap: Record<string, number> = {};

        for (const room of rooms) {
          // Type distribution
          const pt = (room.product_type as string) || 'unknown';
          result.typeDistribution[pt] = (result.typeDistribution[pt] || 0) + 1;

          // Model usage from participants
          const participants = Array.isArray(room.participants) ? room.participants : [];
          for (const p of participants) {
            const mn = ((p as Record<string, unknown>).model_name || (p as Record<string, unknown>).name || '') as string;
            if (mn) {
              result.modelUsage[mn] = (result.modelUsage[mn] || 0) + 1;
              modelAppearances[mn] = (modelAppearances[mn] || 0) + 1;
            }
          }

          // Arena winner tracking
          const arena = room.arena_metadata as Record<string, unknown> | null;
          if (arena) {
            const winner = arena.winner_model as string;
            if (winner) modelWins[winner] = (modelWins[winner] || 0) + 1;
            const signals = arena.engagement_signals as Record<string, Record<string, unknown>> | undefined;
            if (signals) {
              for (const modelSignals of Object.values(signals)) {
                if (modelSignals?.cost_cents) {
                  result.costEstimate.totalCents += modelSignals.cost_cents as number;
                }
              }
              result.costEstimate.arenaCount++;
            }
          }

          // Activity timeline
          const date = (room.created_at as string)?.split('T')[0];
          if (date) dateMap[date] = (dateMap[date] || 0) + 1;
        }

        result.activityTimeline = Object.entries(dateMap)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date));

        result.topModels = Object.keys(modelAppearances)
          .map(model => ({ model, wins: modelWins[model] || 0, appearances: modelAppearances[model] }))
          .sort((a, b) => b.wins - a.wins || b.appearances - a.appearances)
          .slice(0, 10);
      }
    }

    res.json({ analytics: result });
  } catch (err) {
    console.error('[Archives] Analytics error:', err);
    res.status(500).json({ error: 'Failed to compute analytics' });
  }
});

// GET /api/archives/:id/export - Export full archive as JSON download
router.get('/:id/export', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      return res.status(503).json({ error: 'Supabase not configured' });
    }

    const { id } = req.params;
    const source = req.query.source as string;

    if (source === 'supabase-room') {
      const { data, error } = await supabase
        .from('archived_conversations')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Archive not found' });
      }

      const filename = `archive-${(data.room_topic || id).replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50)}.json`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/json');
      return res.json({
        exportedAt: new Date().toISOString(),
        source: 'supabase-room',
        ...data,
      });
    }

    if (source === 'supabase-chat') {
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (!session) {
        return res.status(404).json({ error: 'Chat session not found' });
      }

      const { data: messages } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', id)
        .order('created_at', { ascending: true });

      const filename = `chat-${(session.title || id).replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50)}.json`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/json');
      return res.json({
        exportedAt: new Date().toISOString(),
        source: 'supabase-chat',
        session,
        messages: messages || [],
      });
    }

    res.status(400).json({ error: 'Export requires source=supabase-room or supabase-chat' });
  } catch (err) {
    console.error('[Archives] Export error:', err);
    res.status(500).json({ error: 'Failed to export archive' });
  }
});

// GET /api/archives/:id - Get single archive with messages
router.get('/:id', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const source = req.query.source as string;

    // Try Supabase first if source indicates it
    if (source === 'supabase-room' && isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('archived_conversations')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        return res.json({
          item: normalizeRoom(data),
          messages: data.messages || [],
          participants: data.participants || [],
        });
      }
    }

    if (source === 'supabase-chat' && isSupabaseConfigured() && supabase) {
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (session) {
        const { data: messages } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('session_id', id)
          .order('created_at', { ascending: true });

        return res.json({
          item: normalizeChatSession(session),
          messages: messages || [],
        });
      }
    }

    // Try local session
    const allLocalSessions = await getLocalSessions();
    const localSession = allLocalSessions.find(s => s.sessionId === id);
    if (localSession) {
      return res.json({
        item: normalizeLocalSession(localSession),
        source: 'local-claude',
      });
    }

    res.status(404).json({ error: 'Archive not found' });
  } catch (err) {
    console.error('[Archives] Get error:', err);
    res.status(500).json({ error: 'Failed to fetch archive' });
  }
});

// DELETE /api/archives/:id - Delete archive (Supabase only)
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      return res.status(503).json({ error: 'Supabase not configured' });
    }

    const { id } = req.params;
    const source = req.query.source as string;

    if (source === 'supabase-room') {
      const { error } = await supabase
        .from('archived_conversations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } else if (source === 'supabase-chat') {
      // Delete messages first, then session
      await supabase.from('chat_messages').delete().eq('session_id', id);
      const { error } = await supabase.from('chat_sessions').delete().eq('id', id);
      if (error) throw error;
    } else {
      return res.status(400).json({ error: 'Can only delete Supabase archives' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[Archives] Delete error:', err);
    res.status(500).json({ error: 'Failed to delete archive' });
  }
});

// --- Helpers ---

async function fetchSupabaseArchives(search: string, userId: string, productType?: string, visibility?: string): Promise<UnifiedArchiveItem[]> {
  if (!supabase) {
    console.log('[Archives] fetchSupabaseArchives: supabase client is null');
    return [];
  }

  const items: UnifiedArchiveItem[] = [];

  // Fetch archived conversation rooms belonging to this user OR public rooms
  let roomQuery = supabase
    .from('archived_conversations')
    .select('id, room_topic, room_description, participants, total_upvotes, created_at, ended_at, user_id, is_public, product_type, visibility, arena_metadata, summary')
    .or(`user_id.eq.${userId},is_public.eq.true`)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(500);

  if (search) {
    roomQuery = roomQuery.ilike('room_topic', `%${search}%`);
  }
  if (productType) {
    roomQuery = roomQuery.eq('product_type', productType);
  }
  if (visibility) {
    roomQuery = roomQuery.eq('visibility', visibility);
  }

  const { data: rooms, error: roomError } = await roomQuery;
  if (roomError) {
    console.error('[Archives] Supabase rooms query error:', roomError.message, roomError.code);
  } else {
    const ownCount = rooms?.filter(r => r.user_id === userId).length || 0;
    const publicCount = (rooms?.length || 0) - ownCount;
    console.log(`[Archives] Fetched ${rooms?.length || 0} rooms (${ownCount} owned, ${publicCount} public) for user ${userId.slice(0, 8)}`);
    if (rooms) items.push(...rooms.map(normalizeRoom));
  }

  // Fetch chat sessions belonging to this user only
  let chatQuery = supabase
    .from('chat_sessions')
    .select('id, title, status, is_archived, created_at, ended_at, user_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(500);

  if (search) {
    chatQuery = chatQuery.ilike('title', `%${search}%`);
  }

  const { data: chats, error: chatError } = await chatQuery;
  if (chatError) {
    console.error('[Archives] Supabase chats query error:', chatError.message, chatError.code);
  } else {
    console.log(`[Archives] Fetched ${chats?.length || 0} chat sessions for user ${userId.slice(0, 8)}`);
    if (chats) items.push(...chats.map(normalizeChatSession));
  }

  return items;
}

async function fetchLocalSessions(search: string): Promise<UnifiedArchiveItem[]> {
  const sessions = await getLocalSessions();
  let filtered = sessions;

  if (search) {
    const lower = search.toLowerCase();
    filtered = sessions.filter(s =>
      s.preview?.toLowerCase().includes(lower) ||
      s.projectDisplayName?.toLowerCase().includes(lower)
    );
  }

  return filtered.map(normalizeLocalSession);
}

function normalizeRoom(row: Record<string, unknown>): UnifiedArchiveItem {
  const participants = Array.isArray(row.participants) ? row.participants : [];
  const messages = Array.isArray(row.messages) ? row.messages : [];

  // Extract model names from participants
  const models = participants
    .map((p: Record<string, unknown>) => (p.model_name || p.name || '') as string)
    .filter(Boolean);

  // Infer chatlab from participant count if product_type is missing
  let inferredType = (row.product_type as string) || 'unknown';
  if (inferredType === 'unknown' && participants.length > 2) {
    inferredType = 'chatlab';
  }

  // Preview: prefer summary, then description, then first message
  const firstMsg = messages[0] as Record<string, unknown> | undefined;
  const preview = (row.summary as string) || (row.room_description as string) || (firstMsg?.content as string) || '';

  return {
    id: row.id as string,
    source: 'supabase-room',
    title: (row.room_topic as string) || 'Untitled Discussion',
    preview: preview.slice(0, 200),
    messageCount: messages.length || (row.message_count as number) || 0,
    participants: participants.map((p: Record<string, unknown>) => ((p.name || p.model_name || '') as string)).filter(Boolean),
    models,
    createdAt: row.created_at as string,
    endedAt: row.ended_at as string | undefined,
    upvotes: (row.total_upvotes as number) || 0,
    productType: inferredType,
    visibility: (row.visibility as string) || (row.is_public ? 'public' : 'private'),
    arenaMetadata: row.arena_metadata as Record<string, unknown> | undefined,
    summary: row.summary as string | undefined,
  };
}

function normalizeChatSession(row: Record<string, unknown>): UnifiedArchiveItem {
  return {
    id: row.id as string,
    source: 'supabase-chat',
    title: (row.title as string) || 'Chat Session',
    preview: `Chat session (${row.status || 'unknown'})`,
    messageCount: 0,
    createdAt: row.created_at as string,
    endedAt: row.ended_at as string | undefined,
    userId: row.user_id as string | undefined,
  };
}

function normalizeLocalSession(session: Record<string, unknown>): UnifiedArchiveItem {
  return {
    id: session.sessionId as string,
    source: 'local-claude',
    title: (session.projectDisplayName as string) || 'Claude Code Session',
    preview: (session.preview as string) || '',
    messageCount: (session.messageCount as number) || 0,
    createdAt: session.createdAt as string,
    endedAt: session.updatedAt as string | undefined,
    riskLevel: session.riskLevel as string | undefined,
    riskScore: session.riskScore as number | undefined,
    tags: [
      ...((session.autoTags as string[]) || []),
      ...((session.manualTags as string[]) || []),
    ].filter(Boolean),
    project: session.projectSlug as string | undefined,
  };
}

export default router;
