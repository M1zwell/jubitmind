import { useState } from 'react';
import { useCommandTree, useCommandContent } from '@/hooks/useClaudeApi';
import { FolderTree, File, Folder, ChevronRight, ChevronDown } from 'lucide-react';
import Editor from '@monaco-editor/react';
import type { CommandFile } from '@/lib/types';

function TreeNode({ node, selectedPath, onSelect, depth = 0 }: {
  node: CommandFile;
  selectedPath: string;
  onSelect: (path: string) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (node.type === 'directory') {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-1.5 px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] rounded transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          <Folder className="w-3 h-3 text-teal-400" />
          <span>{node.name}</span>
        </button>
        {expanded && node.children?.map((child) => (
          <TreeNode key={child.path} node={child} selectedPath={selectedPath} onSelect={onSelect} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node.path)}
      className={`w-full flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors ${
        selectedPath === node.path
          ? 'bg-teal-500/20 text-teal-400'
          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
      }`}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      <File className="w-3 h-3" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export function CommandTreeView() {
  const { data, isLoading } = useCommandTree();
  const [selectedPath, setSelectedPath] = useState('');
  const { data: fileData, isLoading: fileLoading } = useCommandContent(selectedPath);
  const tree = (data?.tree || []) as CommandFile[];

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center gap-2">
        <FolderTree className="w-4 h-4 text-teal-400" />
        <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">Commands</h1>
        <span className="text-xs text-[var(--color-text-muted)]">.claude/commands/</span>
      </div>

      <div className="flex flex-1 min-h-0 gap-3">
        <div className="w-64 flex-shrink-0 overflow-auto bg-[var(--color-bg-secondary)] border border-[var(--color-border-muted)] rounded p-1">
          {isLoading ? (
            <div className="p-2 text-xs text-[var(--color-text-muted)]">Loading...</div>
          ) : (
            tree.map((node) => (
              <TreeNode key={node.path} node={node} selectedPath={selectedPath} onSelect={setSelectedPath} />
            ))
          )}
        </div>

        <div className="flex-1 min-w-0 border border-[var(--color-border)] rounded overflow-hidden">
          {!selectedPath ? (
            <div className="flex items-center justify-center h-full text-xs text-[var(--color-text-muted)]">
              Select a command file to view
            </div>
          ) : fileLoading ? (
            <div className="p-4 text-xs text-[var(--color-text-muted)]">Loading...</div>
          ) : (
            <Editor
              height="100%"
              language={selectedPath.endsWith('.xml') ? 'xml' : 'markdown'}
              theme="vs-dark"
              value={fileData?.content || ''}
              options={{
                fontSize: 12,
                fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
                minimap: { enabled: false },
                readOnly: true,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
