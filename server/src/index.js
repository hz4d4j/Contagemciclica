import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { authMiddleware } from './auth.js';
import plansRouter from './routes/plans.js';
import basesRouter from './routes/bases.js';
import historyRouter from './routes/history.js';
import costsRouter from './routes/costs.js';
import positionChecksRouter from './routes/positionChecks.js';
import migrateRouter from './routes/migrate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(express.json({ limit: '50mb' }));

// Health check (no auth needed for platform probes)
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// All /api routes require authentication
const apiAuth = authMiddleware();
app.use('/api', apiAuth);

app.use('/api', plansRouter);
app.use('/api/bases', basesRouter);
app.use('/api/history', historyRouter);
app.use('/api/costs', costsRouter);
app.use('/api/position-checks', positionChecksRouter);
app.use('/api/migrate', migrateRouter);

// Serve frontend static files (Catalyst bundle) when present
const publicDir = path.resolve(__dirname, '..', 'public');
app.use(express.static(publicDir));

// SPA fallback: non-API routes serve index.html
app.get(/^(?!\/api|\/health).*/, (req, res, next) => {
  const indexFile = path.join(publicDir, 'index.html');
  res.sendFile(indexFile, (err) => {
    if (err) next();
  });
});

// Generic error handler — never leak internal details to client
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

// Deny everything else
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

if (config.nodeEnv !== 'test') {
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port} (${config.nodeEnv})`);
  });
}

export default app;
