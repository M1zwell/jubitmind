import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve .env.local relative to server script location (works in packaged app too)
const __serverDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__serverDir, '..', '.env.local') });
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
import extractionsRoutes from './routes/extractions.js';
import reportsRoutes from './routes/reports.js';
import cdpRoutes from './routes/cdp.js';
import unifiedMemoryRoutes from './routes/unified-memory.js';
import { initAdapters } from './services/adapters/index.js';
import { startAuditor } from './services/auditor-agent.js';
import { classifyPendingSessions, refreshAll } from './services/session-cache.js';
import { buildInteractionIndex } from './services/interaction-index.js';
import { startInsightsAgent } from './services/insights-agent.js';
import { memoryStore, vectorStore } from './services/memory/index.js';
import { errorHandler } from './middleware/error-handler.js';

const __dirname = __serverDir;
const IS_PROD = process.env.NODE_ENV === 'production';

const app = express();
const PORT = Number(process.env.PORT) || (IS_PROD ? 3000 : 3001);

const CORS_ORIGINS = [
  'http://127.0.0.1:8081', 'http://localhost:8081',
  'http://127.0.0.1:3000', 'http://localhost:3000',
  ...(process.env.DEMO_MODE === 'true' ? ['https://demo.chathogs.com', 'https://chathogs.com'] : []),
];
app.use(cors({ origin: CORS_ORIGINS }));
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
app.use('/api/extractions', extractionsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/cdp', cdpRoutes);
app.use('/api/unified-memory', unifiedMemoryRoutes);
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

// Bind to 0.0.0.0 on Fly.io (required for external access), 127.0.0.1 otherwise
const BIND_HOST = process.env.FLY_APP_NAME ? '0.0.0.0' : '127.0.0.1';
app.listen(PORT, BIND_HOST, () => {
  const demoTag = process.env.DEMO_MODE === 'true' ? ' [DEMO]' : '';
  console.log(`[JubitMind]${demoTag} Running on http://${BIND_HOST}:${PORT}${IS_PROD ? ' (production)' : ' (development)'}`);
  startAuditor();

  // Background: populate cache, classify, build index, then start insights
  setTimeout(async () => {
    await refreshAll();
    await classifyPendingSessions();
    await buildInteractionIndex();
    startInsightsAgent();

    // Auto-tier memory entries on startup
    try {
      await memoryStore.autoTierEntries();
    } catch (err) {
      console.error('[Memory] Auto-tier failed:', err);
    }

    // Initialize vector store for semantic search
    try {
      await vectorStore.initialize();
    } catch (err) {
      console.warn('[VectorStore] Initialization failed (semantic search unavailable):', err);
    }
  }, 3000);
});
