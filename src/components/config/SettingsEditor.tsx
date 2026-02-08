import { useState, useEffect } from 'react';
import { useSettings, useSaveSettings } from '@/hooks/useClaudeApi';
import { Save, RotateCcw } from 'lucide-react';
import Editor from '@monaco-editor/react';

export function SettingsEditor() {
  const { data, isLoading } = useSettings();
  const saveMutation = useSaveSettings();
  const [content, setContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (data?.content) {
      setContent(data.content);
      setHasChanges(false);
    }
  }, [data?.content]);

  const handleSave = () => {
    try {
      JSON.parse(content);
      saveMutation.mutate(content);
      setHasChanges(false);
    } catch {
      alert('Invalid JSON — please fix syntax errors before saving.');
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">Settings</h1>
          <span className="text-xs text-[var(--color-text-muted)]">.claude/settings.local.json</span>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-xs text-yellow-400">Unsaved changes</span>
          )}
          <button
            onClick={() => { setContent(data?.content || ''); setHasChanges(false); }}
            disabled={!hasChanges}
            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] rounded transition-colors disabled:opacity-30"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
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
          <div className="p-4 text-xs text-[var(--color-text-muted)]">Loading settings...</div>
        ) : (
          <Editor
            height="100%"
            language="json"
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
