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
}

// GET /api/archives - List unified archives
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const source = (req.query.source as string) || 'all';
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const search = (req.query.search as string) || '';

    const items: UnifiedArchiveItem[] = [];
    const hasAuth = !!req.user;
    console.log(`[Archives] GET / source=${source} auth=${hasAuth} user=${req.user?.email || 'anon'}`);

    // Fetch Supabase archives if user is authenticated and Supabase is configured
    // Filter by user_id + public rooms (pagination applied after combining with local)
    if (isSupabaseConfigured() && req.user && (source === 'all' || source === 'supabase')) {
      const supabaseItems = await fetchSupabaseArchives(search, req.user.id);
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
      const [roomCount, chatCount] = await Promise.all([
        supabase.from('archived_conversations').select('id', { count: 'exact', head: true })
          .or(`user_id.eq.${userId},is_public.eq.true`),
        supabase.from('chat_sessions').select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
      ]);
      stats.supabase = {
        rooms: roomCount.count || 0,
        chats: chatCount.count || 0,
      };
    }

    res.json({ stats });
  } catch (err) {
    console.error('[Archives] Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
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
    const localSession = await getLocalSessions().find(s => s.sessionId === id);
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

async function fetchSupabaseArchives(search: string, userId: string): Promise<UnifiedArchiveItem[]> {
  if (!supabase) {
    console.log('[Archives] fetchSupabaseArchives: supabase client is null');
    return [];
  }

  const items: UnifiedArchiveItem[] = [];

  // Fetch archived conversation rooms belonging to this user OR public rooms
  let roomQuery = supabase
    .from('archived_conversations')
    .select('id, room_topic, room_description, participants, total_upvotes, created_at, ended_at, user_id, is_public')
    .or(`user_id.eq.${userId},is_public.eq.true`)
    .order('created_at', { ascending: false })
    .limit(500);

  if (search) {
    roomQuery = roomQuery.ilike('room_topic', `%${search}%`);
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

  // Preview from description or first message (if available)
  const firstMsg = messages[0] as Record<string, unknown> | undefined;
  const preview = (row.room_description as string) || (firstMsg?.content as string) || '';

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
