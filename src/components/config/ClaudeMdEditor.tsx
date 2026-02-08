import { useState, useEffect } from 'react';
import { useClaudeMd, useSaveClaudeMd } from '@/hooks/useClaudeApi';
import { Save, RotateCcw, Eye, Code } from 'lucide-react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';

export function ClaudeMdEditor() {
  const { data, isLoading } = useClaudeMd();
  const saveMutation = useSaveClaudeMd();
  const [content, setContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (data?.content) {
      setContent(data.content);
      setHasChanges(false);
    }
  }, [data?.content]);

  const handleSave = () => {
    saveMutation.mutate(content);
    setHasChanges(false);
  };

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">CLAUDE.md</h1>
          <span className="text-xs text-[var(--color-text-muted)]">Project instructions for Claude Code</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`inline-flex items-center gap-1 px-2 py-1.5 text-xs rounded transition-colors ${
              showPreview ? 'bg-teal-500/20 text-teal-400' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
            }`}
          >
            {showPreview ? <Code className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showPreview ? 'Editor' : 'Preview'}
          </button>
          {hasChanges && <span className="text-xs text-yellow-400">Unsaved</span>}
          <button
            onClick={() => { setContent(data?.content || ''); setHasChanges(false); }}
            disabled={!hasChanges}
            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] rounded transition-colors disabled:opacity-30"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saveMutation.isPending}
            className="inline-flex items-center gap-1 px-2 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
          >
            <Save className="w-3 h-3" />
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 border border-[var(--color-border)] rounded overflow-hidden">
        {isLoading ? (
          <div className="p-4 text-xs text-[var(--color-text-muted)]">Loading...</div>
        ) : showPreview ? (
          <div className="p-4 overflow-auto h-full prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        ) : (
          <Editor
            height="100%"
            language="markdown"
            theme="vs-dark"
            value={content}
            onChange={(val) => { setContent(val || ''); setHasChanges(true); }}
            options={{
              fontSize: 12,
              fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
              minimap: { enabled: false },
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              tabSize: 2,
            }}
          />
        )}
      </div>
    </div>
  );
}
