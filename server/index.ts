import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import cliRoutes from './routes/cli.js';
import mcpRoutes from './routes/mcp.js';
import configRoutes from './routes/config.js';
import skillsRoutes from './routes/skills.js';
import memoryRoutes from './routes/memory.js';
import systemRoutes from './routes/system.js';
import providersRoutes from './routes/providers.js';
import conversationsRoutes from './routes/conversations.js';
import archivesRoutes from './routes/archives.js';
import analysisRoutes from './routes/analysis.js';
import adapterRoutes from './routes/adapters.js';
import litellmRoutes from './routes/litellm.js';
import auditorRoutes from './routes/auditor.js';
import agentConfigRoutes from './routes/agent-configs.js';
import explorerRoutes from './routes/explorer.js';
import insightsRoutes from './routes/insights.js';
import { initAdapters } from './services/adapters/index.js';
import { startAuditor } from './services/auditor-agent.js';
import { classifyPendingSessions } from './services/session-cache.js';
import { buildInteractionIndex } from './services/interaction-index.js';
import { startInsightsAgent } from './services/insights-agent.js';
import { errorHandler } from './middleware/error-handler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IS_PROD = process.env.NODE_ENV === 'production';

const app = express();
const PORT = Number(process.env.PORT) || (IS_PROD ? 3000 : 3001);

app.use(cors({ origin: ['http://127.0.0.1:8081', 'http://localhost:8081', 'http://127.0.0.1:3000', 'http://localhost:3000'] }));
app.use(express.json({ limit: '10mb' }));

// Initialize AI tool adapter registry
initAdapters();

// API Routes
app.use('/api/cli', cliRoutes);
app.use('/api/mcp', mcpRoutes);
app.use('/api/config', configRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/commands', skillsRoutes); // Commands share skills router
app.use('/api/memory', memoryRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/providers', providersRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/archives', archivesRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/adapters', adapterRoutes);
app.use('/api/litellm', litellmRoutes);
app.use('/api/auditor', auditorRoutes);
app.use('/api/agent-configs', agentConfigRoutes);
app.use('/api/explorer', explorerRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api', systemRoutes); // Mount /api/plugins/list

// Error handler
app.use(errorHandler);

// Production: serve Vite build output as static files + SPA fallback
if (IS_PROD) {
  const clientDir = path.resolve(__dirname, '..', 'client');
  app.use(express.static(clientDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDir, 'index.html'));
  });
}

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[JubitMind] Running on http://127.0.0.1:${PORT}${IS_PROD ? ' (production)' : ' (development)'}`);
  startAuditor();

  // Background: classify all sessions, build index, then start insights (non-blocking)
  setTimeout(async () => {
    await classifyPendingSessions();
    await buildInteractionIndex();
    startInsightsAgent();
  }, 3000);
});
