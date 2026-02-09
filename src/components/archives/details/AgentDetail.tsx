import { Bot, Code, Terminal } from 'lucide-react';
import type { UnifiedArchiveItem } from '@/lib/types';

interface Props {
  messages: unknown[];
  item: UnifiedArchiveItem;
}

export function AgentDetail({ messages, item }: Props) {
  return (
    <div className="space-y-3 text-xs">
      {item.summary && (
        <div className="bg-[var(--color-bg-secondary)] rounded p-2 text-[var(--color-text-secondary)]">
          {item.summary}
        </div>
      )}

      <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-medium">
        <Bot className="w-3 h-3" />
        Agent Session - Tool calls and code execution
      </div>

      {messages.slice(0, 30).map((msg, i) => {
        const m = msg as Record<string, unknown>;
        const role = (m.role || m.sender || m.model_name || 'unknown') as string;
        const content = (m.content || m.text || m.message || '') as string;
        const isToolUse = m.type === 'tool_use' || m.tool_name;
        const isToolResult = m.type === 'tool_result';
        const toolName = m.tool_name as string | undefined;

        if (isToolUse) {
          return (
            <div key={i} className="border-l-2 border-emerald-400/40 pl-2 py-1">
              <div className="flex items-center gap-1 text-emerald-400 mb-0.5">
                <Terminal className="w-2.5 h-2.5" />
                <span className="font-medium text-[10px]">{toolName || 'tool_use'}</span>
              </div>
              <pre className="text-[10px] text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] rounded p-1.5 overflow-x-auto whitespace-pre-wrap">
                {typeof m.tool_input === 'object' ? JSON.stringify(m.tool_input, null, 2).slice(0, 300) : String(content).slice(0, 300)}
              </pre>
            </div>
          );
        }

        if (isToolResult) {
          return (
            <div key={i} className="border-l-2 border-yellow-400/40 pl-2 py-1">
              <div className="flex items-center gap-1 text-yellow-400 mb-0.5">
                <Code className="w-2.5 h-2.5" />
                <span className="font-medium text-[10px]">result</span>
              </div>
              <pre className="text-[10px] text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] rounded p-1.5 overflow-x-auto whitespace-pre-wrap">
                {String(m.tool_result || content).slice(0, 300)}
              </pre>
            </div>
          );
        }

        const isHuman = role === 'user' || (m.isHuman as boolean);
        return (
          <div key={i} className={`border-l-2 pl-2 py-1 ${isHuman ? 'border-teal-500/40' : 'border-[var(--color-border)]'}`}>
            <span className={`font-medium ${isHuman ? 'text-teal-400' : 'text-[var(--color-text-secondary)]'}`}>{role}: </span>
            <span className="text-[var(--color-text-muted)]">
              {typeof content === 'string' ? content.slice(0, 400) : JSON.stringify(content).slice(0, 400)}
            </span>
          </div>
        );
      })}
      {messages.length > 30 && (
        <p className="text-[10px] text-[var(--color-text-muted)] pt-1">+ {messages.length - 30} more messages</p>
      )}
    </div>
  );
}
