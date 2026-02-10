import { useState } from 'react';
import { History, Search, Cloud, Download, Upload, FolderOpen, ShieldAlert, Tag } from 'lucide-react';
import {
  useConversationSessions,
  useDeleteConversation,
  useProjects,
  useAllTags,
} from '@/hooks/useConversations';
import { api } from '@/lib/api';
import { SessionList } from './SessionList';
import { MessageThread } from './MessageThread';
import type { SessionMeta, RiskLevel } from '@/lib/types';

type SourceFilter = 'all' | 'dashboard' | 'claude-code' | 'cloud';

export function ConversationHistory() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | undefined>(undefined);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [projectFilter, setProjectFilter] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<string | undefined>(undefined);
  const [tagFilter, setTagFilter] = useState<string[]>([]);

  const { data, isLoading } = useConversationSessions(sourceFilter, projectFilter, riskFilter, tagFilter.length > 0 ? tagFilter : undefined);
  const { data: projectsData } = useProjects();
  const { data: tagsData } = useAllTags();
  const deleteConversation = useDeleteConversation();

  const sessions = (data?.sessions || []) as SessionMeta[];

  // Client-side search filter on preview text
  const filtered = searchQuery
    ? sessions.filter((s) =>
        s.preview?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : sessions;

  const handleSelect = (sessionId: string) => {
    setSelectedSession(sessionId);
    const session = sessions.find((s) => s.sessionId === sessionId);
    setSelectedProject(session?.projectSlug);
  };

  const handleDelete = (sessionId: string) => {
    if (selectedSession === sessionId) setSelectedSession(null);
    deleteConversation.mutate(sessionId);
  };

  const handleCloudImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const conversations = Array.isArray(data) ? data : data.conversations || [data];
      await api.cloudImport({ conversations });
      window.location.reload();
    } catch (err) {
      console.error('Import failed:', err);
    }
  };

  const handleCloudExport = async () => {
    if (!selectedSession) return;
    try {
      const result = await api.cloudExport(selectedSession, selectedProject);
      const blob = new Blob([JSON.stringify(result.session, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-${selectedSession.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-teal-400" />
          <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Conversation History
          </h1>
          {data && (
            <span className="text-[10px] text-[var(--color-text-muted)]">
              {data.total} sessions
            </span>
          )}
          {projectsData && (
            <span className="text-[10px] text-[var(--color-text-muted)]">
              / {projectsData.projects.length} projects
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="pl-7 pr-2 py-1 text-xs bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] w-48 focus:outline-none focus:border-teal-500/50"
            />
          </div>

          {/* Project Filter */}
          <div className="relative flex items-center">
            <FolderOpen className="absolute left-2 w-3 h-3 text-[var(--color-text-muted)] pointer-events-none" />
            <select
              value={projectFilter || ''}
              onChange={(e) => setProjectFilter(e.target.value || undefined)}
              className="pl-7 pr-6 py-1 text-[10px] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:border-teal-500/50 appearance-none cursor-pointer"
            >
              <option value="">All Projects</option>
              {projectsData?.projects.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.displayName} ({p.sessionCount})
                </option>
              ))}
            </select>
          </div>

          {/* Risk Filter */}
          <div className="relative flex items-center">
            <ShieldAlert className="absolute left-2 w-3 h-3 text-[var(--color-text-muted)] pointer-events-none" />
            <select
              value={riskFilter || ''}
              onChange={(e) => setRiskFilter(e.target.value || undefined)}
              className="pl-7 pr-6 py-1 text-[10px] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:border-teal-500/50 appearance-none cursor-pointer"
            >
              <option value="">All Risk</option>
              <option value="critical">Critical+</option>
              <option value="high">High+</option>
              <option value="medium">Medium+</option>
              <option value="low">Low+</option>
            </select>
          </div>

          {/* Tag Filter */}
          {tagsData && tagsData.tags.length > 0 && (
            <div className="relative flex items-center">
              <Tag className="absolute left-2 w-3 h-3 text-[var(--color-text-muted)] pointer-events-none" />
              <select
                value=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (v && !tagFilter.includes(v)) setTagFilter([...tagFilter, v]);
                }}
                className="pl-7 pr-6 py-1 text-[10px] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:border-teal-500/50 appearance-none cursor-pointer"
              >
                <option value="">Filter by Tag</option>
                {tagsData.tags.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}

          {/* Active tag filters */}
          {tagFilter.length > 0 && (
            <div className="flex items-center gap-0.5">
              {tagFilter.map((t) => (
                <button
                  key={t}
                  onClick={() => setTagFilter(tagFilter.filter((x) => x !== t))}
                  className="text-[9px] px-1.5 py-0.5 bg-teal-500/20 text-teal-400 rounded hover:bg-red-500/20 hover:text-red-400 transition-colors"
                  title="Click to remove"
                >
                  {t} x
                </button>
              ))}
            </div>
          )}

          {/* Source Filter */}
          <div className="flex items-center gap-0.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded p-0.5">
            {(['all', 'dashboard', 'claude-code', 'cloud'] as SourceFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setSourceFilter(f)}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                  sourceFilter === f
                    ? 'bg-teal-500/20 text-teal-400'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {f === 'all'
                  ? 'All'
                  : f === 'dashboard'
                    ? 'Dashboard'
                    : f === 'claude-code'
                      ? 'Claude Code'
                      : 'Cloud'}
              </button>
            ))}
          </div>

          {/* Export/Import */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleCloudExport}
              disabled={!selectedSession}
              title="Export selected session"
              className="p-1 text-[var(--color-text-muted)] hover:text-teal-400 transition-colors disabled:opacity-30"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <label
              title="Import conversation JSON"
              className="p-1 text-[var(--color-text-muted)] hover:text-teal-400 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleCloudImport}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {sourceFilter === 'cloud' ? (
        <div className="flex-1 min-h-0 flex items-center justify-center border border-[var(--color-border)] rounded bg-[var(--color-bg-secondary)]">
          <div className="text-center space-y-4 p-8">
            <Cloud className="w-10 h-10 text-[var(--color-text-muted)] mx-auto opacity-50" />
            <div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-1">
                Cloud Sync Coming Soon
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)] max-w-xs">
                Direct sync with claude.ai web conversations is not yet available.
                Use import/export buttons above to manually manage conversation data.
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <label className="px-3 py-1.5 text-xs bg-teal-500/20 text-teal-400 rounded cursor-pointer hover:bg-teal-500/30 transition-colors">
                Import JSON
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleCloudImport}
                />
              </label>
              <button
                onClick={handleCloudExport}
                disabled={!selectedSession}
                className="px-3 py-1.5 text-xs bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] rounded disabled:opacity-50 hover:bg-[var(--color-bg-primary)] transition-colors"
              >
                Export Selected
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex gap-3">
          <SessionList
            sessions={filtered}
            selected={selectedSession}
            onSelect={handleSelect}
            onDelete={handleDelete}
            isLoading={isLoading}
            showProject={!projectFilter}
          />
          <MessageThread sessionId={selectedSession} project={selectedProject} />
        </div>
      )}
    </div>
  );
}
