import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import express from 'express';
import cors from 'cors';
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
import { errorHandler } from './middleware/error-handler.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors({ origin: ['http://127.0.0.1:8081', 'http://localhost:8081', 'http://127.0.0.1:3000'] }));
app.use(express.json({ limit: '10mb' }));

// Routes
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
app.use('/api', systemRoutes); // Mount /api/plugins/list

// Error handler
app.use(errorHandler);

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[Claude Dashboard API] Running on http://127.0.0.1:${PORT}`);
});
