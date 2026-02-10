import { useState } from 'react';
import { User, Bot, Copy, Check, ChevronDown, ChevronRight, Wrench, Brain } from 'lucide-react';
import type { ConversationMessage, ContentBlock } from '@/lib/types';
import { scoreBlock, RISK_COLORS } from './risk-utils';

interface Props {
  message: ConversationMessage;
}

function ToolUseBlock({ block }: { block: ContentBlock }) {
  const [expanded, setExpanded] = useState(false);
  const { level } = scoreBlock(block);
  const colors = RISK_COLORS[level];
  const inputStr = JSON.stringify(block.input || {}, null, 2);
  const preview = inputStr.length > 120 ? inputStr.slice(0, 120) + '...' : inputStr;

  return (
    <div className={`border-l-2 ${colors.border} ${colors.bg} rounded-r px-2 py-1.5 my-1`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 w-full text-left"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-[var(--color-text-muted)]" />
        ) : (
          <ChevronRight className="w-3 h-3 text-[var(--color-text-muted)]" />
        )}
        <Wrench className={`w-3 h-3 ${colors.text}`} />
        <span className={`text-[10px] font-mono font-medium ${colors.text}`}>
          {block.name}
        </span>
        <span className={`text-[8px] px-1 rounded ${colors.bg} ${colors.text} capitalize`}>
          {level}
        </span>
      </button>
      {!expanded && (
        <div className="text-[9px] text-[var(--color-text-muted)] font-mono mt-0.5 truncate pl-5">
          {preview}
        </div>
      )}
      {expanded && (
        <pre className="text-[9px] text-[var(--color-text-secondary)] font-mono mt-1 overflow-x-auto max-h-[300px] overflow-y-auto pl-5 whitespace-pre-wrap break-words">
          {inputStr}
        </pre>
      )}
    </div>
  );
}

function ToolResultBlock({ block }: { block: ContentBlock }) {
  const [expanded, setExpanded] = useState(false);
  const content = typeof block.content === 'string' ? block.content : JSON.stringify(block.content || '', null, 2);
  const preview = content.length > 200 ? content.slice(0, 200) + '...' : content;

  return (
    <div className="border-l-2 border-gray-500/30 bg-gray-500/5 rounded-r px-2 py-1.5 my-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 w-full text-left"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-[var(--color-text-muted)]" />
        ) : (
          <ChevronRight className="w-3 h-3 text-[var(--color-text-muted)]" />
        )}
        <span className="text-[10px] text-[var(--color-text-muted)]">Result</span>
      </button>
      <pre className="text-[9px] text-[var(--color-text-muted)] font-mono mt-0.5 overflow-x-auto max-h-[200px] overflow-y-auto pl-5 whitespace-pre-wrap break-words">
        {expanded ? content : preview}
      </pre>
    </div>
  );
}

function ThinkingBlock({ block }: { block: ContentBlock }) {
  const [expanded, setExpanded] = useState(false);
  const text = block.text || '';

  return (
    <div className="border-l-2 border-violet-500/30 bg-violet-500/5 rounded-r px-2 py-1.5 my-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 w-full text-left"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-violet-400/50" />
        ) : (
          <ChevronRight className="w-3 h-3 text-violet-400/50" />
        )}
        <Brain className="w-3 h-3 text-violet-400/50" />
        <span className="text-[10px] text-violet-400/70">Thinking</span>
        {!expanded && (
          <span className="text-[9px] text-[var(--color-text-muted)] truncate">
            {text.slice(0, 80)}...
          </span>
        )}
      </button>
      {expanded && (
        <pre className="text-[9px] text-[var(--color-text-muted)] font-mono mt-1 overflow-x-auto max-h-[300px] overflow-y-auto pl-5 whitespace-pre-wrap break-words">
          {text}
        </pre>
      )}
    </div>
  );
}

function renderContentBlocks(blocks: ContentBlock[]) {
  return blocks.map((block, idx) => {
    if (block.type === 'text' && block.text) {
      return (
        <div key={idx} className="whitespace-pre-wrap break-words">
          {block.text}
        </div>
      );
    }
    if (block.type === 'tool_use') {
      return <ToolUseBlock key={idx} block={block} />;
    }
    if (block.type === 'tool_result') {
      return <ToolResultBlock key={idx} block={block} />;
    }
    if (block.type === 'thinking') {
      return <ThinkingBlock key={idx} block={block} />;
    }
    return null;
  });
}

export function MessageBlock({ message }: Props) {
  const [copied, setCopied] = useState(false);
  const isUser = message.type === 'user';

  const isArrayContent = Array.isArray(message.message?.content);
  const plainContent = isArrayContent
    ? ''
    : typeof message.message?.content === 'string'
      ? message.message.content
      : JSON.stringify(message.message?.content ?? '', null, 2);

  const handleCopy = () => {
    let text = plainContent;
    if (isArrayContent) {
      const blocks = message.message!.content as ContentBlock[];
      text = blocks
        .map((b) => {
          if (b.type === 'text') return b.text;
          if (b.type === 'tool_use') return `[Tool: ${b.name}]\n${JSON.stringify(b.input, null, 2)}`;
          if (b.type === 'tool_result') return `[Result]\n${typeof b.content === 'string' ? b.content : JSON.stringify(b.content)}`;
          return '';
        })
        .filter(Boolean)
        .join('\n\n');
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
          isUser ? 'bg-blue-500/20' : 'bg-teal-500/20'
        }`}
      >
        {isUser ? (
          <User className="w-3 h-3 text-blue-400" />
        ) : (
          <Bot className="w-3 h-3 text-teal-400" />
        )}
      </div>

      <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : ''}`}>
        <div className={`flex items-center gap-2 mb-1 ${isUser ? 'justify-end' : ''}`}>
          <span className="text-[10px] text-[var(--color-text-muted)]">
            {message.timestamp
              ? new Date(message.timestamp).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''}
          </span>
          <button
            onClick={handleCopy}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>

        <div
          className={`inline-block max-w-[85%] px-3 py-2 rounded text-xs leading-relaxed ${
            isUser
              ? 'bg-blue-500/10 text-[var(--color-text-primary)]'
              : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
          }`}
        >
          {isArrayContent ? (
            <div className="space-y-1">
              {renderContentBlocks(message.message!.content as ContentBlock[])}
            </div>
          ) : (
            <div className="whitespace-pre-wrap break-words">{plainContent}</div>
          )}
        </div>
      </div>
    </div>
  );
}
