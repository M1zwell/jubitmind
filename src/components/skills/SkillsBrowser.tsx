import { useState } from 'react';
import { useSkills, useSkill } from '@/hooks/useClaudeApi';
import { Puzzle, ChevronRight } from 'lucide-react';
import Editor from '@monaco-editor/react';

export function SkillsBrowser() {
  const { data, isLoading } = useSkills();
  const [selected, setSelected] = useState('');
  const { data: skillData, isLoading: skillLoading } = useSkill(selected);
  const skills = (data?.skills || []) as Array<{ name: string; displayName?: string; description?: string; version?: string; path: string }>;

  return (
    <div className="flex flex-col h-full gap-3">
      <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">Skills</h1>

      <div className="flex flex-1 min-h-0 gap-3">
        <div className="w-64 flex-shrink-0 overflow-auto">
          {isLoading ? (
            <div className="text-xs text-[var(--color-text-muted)]">Loading...</div>
          ) : (
            <div className="space-y-1">
              {skills.map((skill) => (
                <button
                  key={skill.name}
                  onClick={() => setSelected(skill.name)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded text-left transition-colors ${
                    selected === skill.name
                      ? 'bg-teal-500/20 text-teal-400'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
                  }`}
                >
                  <Puzzle className="w-3.5 h-3.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">{skill.displayName || skill.name}</div>
                    {skill.version && (
                      <div className="text-xs text-[var(--color-text-muted)]">v{skill.version}</div>
                    )}
                  </div>
                  <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0 text-[var(--color-text-muted)]" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 border border-[var(--color-border)] rounded overflow-hidden">
          {!selected ? (
            <div className="flex items-center justify-center h-full text-xs text-[var(--color-text-muted)]">
              Select a skill to view its content
            </div>
          ) : skillLoading ? (
            <div className="p-4 text-xs text-[var(--color-text-muted)]">Loading skill...</div>
          ) : (
            <Editor
              height="100%"
              language="markdown"
              theme="vs-dark"
              value={(skillData?.skill as Record<string, string>)?.content || ''}
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
