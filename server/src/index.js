import express from 'express';
import { config } from './config.js';
import { authMiddleware } from './auth.js';
import plansRouter from './routes/plans.js';
import basesRouter from './routes/bases.js';
import historyRouter from './routes/history.js';
import costsRouter from './routes/costs.js';
import positionChecksRouter from './routes/positionChecks.js';
import migrateRouter from './routes/migrate.js';

const app = express();

app.use(express.json({ limit: '50mb' }));

// Health check (no auth needed for platform probes)
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// All /api routes require authentication
const apiAuth = authMiddleware();
app.use('/api', apiAuth);

app.use('/api/plans', plansRouter);
app.use('/api/bases', basesRouter);
app.use('/api/history', historyRouter);
app.use('/api/costs', costsRouter);
app.use('/api/position-checks', positionChecksRouter);
app.use('/api/migrate', migrateRouter);

// Generic error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Erro interno do servidor.' });
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
