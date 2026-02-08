import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { CliRunner } from '@/components/cli/CliRunner';
import { McpOverview } from '@/components/mcp/McpOverview';
import { PermissionsView } from '@/components/config/PermissionsView';
import { SettingsEditor } from '@/components/config/SettingsEditor';
import { ClaudeMdEditor } from '@/components/config/ClaudeMdEditor';
import { SkillsBrowser } from '@/components/skills/SkillsBrowser';
import { CommandTreeView } from '@/components/skills/CommandTree';
import { MemoryManager } from '@/components/memory/MemoryManager';
import { UsageDashboard } from '@/components/stats/UsageDashboard';
import { ProvidersPage } from '@/components/providers/ProvidersPage';
import { ConversationHistory } from '@/components/conversations/ConversationHistory';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/terminal" replace />} />
            <Route path="/terminal" element={<CliRunner />} />
            <Route path="/providers" element={<ProvidersPage />} />
            <Route path="/mcp" element={<McpOverview />} />
            <Route path="/permissions" element={<PermissionsView />} />
            <Route path="/settings" element={<SettingsEditor />} />
            <Route path="/claude-md" element={<ClaudeMdEditor />} />
            <Route path="/skills" element={<SkillsBrowser />} />
            <Route path="/commands" element={<CommandTreeView />} />
            <Route path="/memory" element={<MemoryManager />} />
            <Route path="/history" element={<ConversationHistory />} />
            <Route path="/health" element={<UsageDashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
