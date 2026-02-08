import { useState, useEffect } from 'react';
import { useMemoryProjects, useMemoryContent, useSaveMemory } from '@/hooks/useClaudeApi';
import { Brain, Save } from 'lucide-react';
import Editor from '@monaco-editor/react';
import type { MemoryProject } from '@/lib/types';

export function MemoryManager() {
  const { data: projectsData, isLoading: projectsLoading } = useMemoryProjects();
  const [selectedProject, setSelectedProject] = useState('');
  const { data: memoryData, isLoading: memoryLoading } = useMemoryContent(selectedProject);
  const saveMutation = useSaveMemory();
  const [content, setContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const projects = (projectsData?.projects || []) as MemoryProject[];

  useEffect(() => {
    if (memoryData?.content) {
      setContent(memoryData.content);
      setHasChanges(false);
    }
  }, [memoryData?.content]);

  const handleSave = () => {
    if (selectedProject) {
      saveMutation.mutate({ project: selectedProject, content });
      setHasChanges(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-pink-400" />
          <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">Memory</h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded px-2 py-1 text-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-teal-500 max-w-[300px]"
          >
            <option value="">Select project...</option>
            {projects.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name} {p.hasMemory ? '' : '(no memory)'}
              </option>
            ))}
          </select>
          {hasChanges && <span className="text-xs text-yellow-400">Unsaved</span>}
          <button
            onClick={handleSave}
            disabled={!hasChanges || !selectedProject || saveMutation.isPending}
            className="inline-flex items-center gap-1 px-2 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
          >
            <Save className="w-3 h-3" />
            Save
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 border border-[var(--color-border)] rounded overflow-hidden">
        {!selectedProject ? (
          <div className="flex items-center justify-center h-full text-xs text-[var(--color-text-muted)]">
            Select a project to view its MEMORY.md
          </div>
        ) : projectsLoading || memoryLoading ? (
          <div className="p-4 text-xs text-[var(--color-text-muted)]">Loading...</div>
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
