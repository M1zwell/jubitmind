import { useState, useEffect, useRef, useMemo } from 'react';
import { Loader2, ChevronDown, User, Bot, Wrench, Brain, Shield, Filter } from 'lucide-react';
import { useConversationMessages } from '@/hooks/useConversations';
import { MessageBlock } from './MessageBlock';
import { TagManager } from './TagManager';
import type { ConversationMessage, ContentBlock } from '@/lib/types';

type MessageTypeFilter = 'all' | 'prompts' | 'planning' | 'tools' | 'permissions';

const MESSAGE_TYPE_OPTIONS: { value: MessageTypeFilter; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'all', label: 'All', icon: <Filter className="w-3 h-3" />, description: 'All messages' },
  { value: 'prompts', label: 'Prompts', icon: <User className="w-3 h-3" />, description: 'User input' },
  { value: 'planning', label: 'Planning', icon: <Brain className="w-3 h-3" />, description: 'AI thinking & text' },
  { value: 'tools', label: 'Executions', icon: <Wrench className="w-3 h-3" />, description: 'Tool calls & results' },
  { value: 'permissions', label: 'Permissions', icon: <Shield className="w-3 h-3" />, description: 'Permission-related' },
];

// Permission/approval-related tool names and patterns
const PERMISSION_TOOLS = new Set(['Bash', 'Write', 'Edit', 'NotebookEdit']);
const PERMISSION_PATTERNS = [/permission/i, /approved/i, /denied/i, /allow/i, /reject/i];

function classifyMessage(msg: ConversationMessage): Set<MessageTypeFilter> {
  const types = new Set<MessageTypeFilter>();

  if (msg.type === 'user') {
    types.add('prompts');
    return types;
  }

  // Assistant messages — classify by content blocks
  const content = msg.message?.content;
  if (!content) return types;

  if (typeof content === 'string') {
    types.add('planning');
    return types;
  }

  if (Array.isArray(content)) {
    for (const block of content as ContentBlock[]) {
      if (block.type === 'text' || block.type === 'thinking') {
        types.add('planning');
      }
      if (block.type === 'tool_use') {
        types.add('tools');
        // Check if this is a permission-sensitive tool
        if (block.name && PERMISSION_TOOLS.has(block.name)) {
          types.add('permissions');
        }
      }
      if (block.type === 'tool_result') {
        types.add('tools');
        // Check content for permission patterns
        const resultText = typeof block.content === 'string' ? block.content : '';
        if (PERMISSION_PATTERNS.some((p) => p.test(resultText))) {
          types.add('permissions');
        }
      }
    }
  }

  return types;
}

interface Props {
  sessionId: string | null;
  project?: string;
}

export function MessageThread({ sessionId, project }: Props) {
  const [offset, setOffset] = useState(0);
  const [allMessages, setAllMessages] = useState<ConversationMessage[]>([]);
  const [typeFilter, setTypeFilter] = useState<MessageTypeFilter>('all');
  const limit = 50;
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useConversationMessages(sessionId, offset, limit, project);

  // Reset when session changes
  useEffect(() => {
    setOffset(0);
    setAllMessages([]);
    setTypeFilter('all');
  }, [sessionId]);

  // Append new messages when data arrives
  useEffect(() => {
    if (data?.messages) {
      if (offset === 0) {
        setAllMessages(data.messages as ConversationMessage[]);
      } else {
        setAllMessages((prev) => [...prev, ...(data.messages as ConversationMessage[])]);
      }
    }
  }, [data, offset]);

  // Filter messages by type
  const filteredMessages = useMemo(() => {
    if (typeFilter === 'all') return allMessages;
    return allMessages.filter((msg) => {
      const types = classifyMessage(msg);
      return types.has(typeFilter);
    });
  }, [allMessages, typeFilter]);

  // Count messages per type for filter badges
  const typeCounts = useMemo(() => {
    const counts: Record<MessageTypeFilter, number> = { all: allMessages.length, prompts: 0, planning: 0, tools: 0, permissions: 0 };
    for (const msg of allMessages) {
      const types = classifyMessage(msg);
      if (types.has('prompts')) counts.prompts++;
      if (types.has('planning')) counts.planning++;
      if (types.has('tools')) counts.tools++;
      if (types.has('permissions')) counts.permissions++;
    }
    return counts;
  }, [allMessages]);

  if (!sessionId) {
    return (
      <div className="flex-1 border border-[var(--color-border)] rounded bg-[var(--color-bg-secondary)] flex items-center justify-center">
        <span className="text-xs text-[var(--color-text-muted)]">
          Select a conversation to view messages
        </span>
      </div>
    );
  }

  if (isLoading && allMessages.length === 0) {
    return (
      <div className="flex-1 border border-[var(--color-border)] rounded bg-[var(--color-bg-secondary)] flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
      </div>
    );
  }

  if (allMessages.length === 0) {
    return (
      <div className="flex-1 border border-[var(--color-border)] rounded bg-[var(--color-bg-secondary)] flex items-center justify-center">
        <span className="text-xs text-[var(--color-text-muted)]">No messages in this session</span>
      </div>
    );
  }

  return (
    <div className="flex-1 border border-[var(--color-border)] rounded bg-[var(--color-bg-secondary)] flex flex-col overflow-hidden">
      <TagManager sessionId={sessionId} project={project} />

      {/* Message type filter bar */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[var(--color-border)] flex-shrink-0 overflow-x-auto">
        {MESSAGE_TYPE_OPTIONS.map((opt) => {
          const count = typeCounts[opt.value];
          const isActive = typeFilter === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value)}
              title={opt.description}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-teal-500/20 text-teal-400'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
              }`}
            >
              {opt.icon}
              {opt.label}
              {count > 0 && (
                <span className={`text-[8px] px-1 rounded-full ${isActive ? 'bg-teal-500/30' : 'bg-[var(--color-bg-tertiary)]'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
        {typeFilter !== 'all' && (
          <span className="text-[9px] text-[var(--color-text-muted)] ml-auto">
            {filteredMessages.length}/{allMessages.length}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredMessages.map((msg, idx) => (
          <MessageBlock key={msg.uuid || `msg-${idx}`} message={msg} />
        ))}

        {filteredMessages.length === 0 && typeFilter !== 'all' && (
          <div className="text-center py-8">
            <span className="text-[10px] text-[var(--color-text-muted)]">
              No {MESSAGE_TYPE_OPTIONS.find((o) => o.value === typeFilter)?.label.toLowerCase()} messages in this session
            </span>
          </div>
        )}

        {data?.hasMore && (
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-primary)] text-xs text-[var(--color-text-secondary)] rounded transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            Load More
          </button>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
