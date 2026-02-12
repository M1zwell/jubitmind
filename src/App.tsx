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
import { ArchivedDiscussions } from '@/pages/ArchivedDiscussions';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { ChatABPage } from '@/pages/ChatABPage';
import { ChatLabPage } from '@/pages/ChatLabPage';
import { SessionAnalysisPage } from '@/pages/SessionAnalysisPage';
import { AuthCallback } from '@/pages/AuthCallback';
import { HomePage } from '@/components/dashboard/HomePage';
import { RoutingDashboard } from '@/components/litellm/RoutingDashboard';
import { AuditorPage } from '@/components/auditor/AuditorPage';
import { AgentConfigsPage } from '@/components/config/AgentConfigsPage';
import { InteractionExplorerPage } from '@/pages/InteractionExplorerPage';
import { InsightsPage } from '@/pages/InsightsPage';
import { ExtractionsPage } from '@/pages/ExtractionsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SetupWizardPage } from '@/pages/SetupWizardPage';
import { CDPBrowserPage } from '@/pages/CDPBrowserPage';
import { UnifiedMemoryPage } from '@/pages/UnifiedMemoryPage';

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
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/setup-wizard" element={<SetupWizardPage />} />
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
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
            <Route path="/archived-discussions" element={<ArchivedDiscussions />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/chatab" element={<ChatABPage />} />
            <Route path="/chatlab" element={<ChatLabPage />} />
            <Route path="/analysis" element={<SessionAnalysisPage />} />
            <Route path="/litellm" element={<RoutingDashboard />} />
            <Route path="/auditor" element={<AuditorPage />} />
            <Route path="/agent-configs" element={<AgentConfigsPage />} />
            <Route path="/explorer" element={<InteractionExplorerPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/extractions" element={<ExtractionsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/health" element={<UsageDashboard />} />
            <Route path="/browser" element={<CDPBrowserPage />} />
            <Route path="/unified-memory" element={<UnifiedMemoryPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
