import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { errorHandler } from './middleware/errorHandler.js';
import { ensureDefaultUser } from './lib/seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// In production (pkg release), serve Vite build from dist/
const distPath = path.resolve(__dirname, '../../dist');
const isProduction = fs.existsSync(distPath);

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const routeDefs = [
  { path: '/api/auth', module: './routes/auth.js' },
  { path: '/api/settings', module: './routes/settings.js' },
  { path: '/api/courses', module: './routes/courses.js' },
  { path: '/api/progress', module: './routes/progress.js' },
  { path: '/api/import', module: './routes/import.js' },
  { path: '/api/problems', module: './routes/problems.js' },
  { path: '/api/execute', module: './routes/execute.js' },
  { path: '/api/review', module: './routes/review.js' },
  { path: '/api/files', module: './routes/files.js' },
];

for (const { path: rp, module: mod } of routeDefs) {
  try {
    const m = await import(mod);
    app.use(rp, m.default);
    console.log('[routes] OK:', rp);
  } catch (e: any) {
    console.error('[routes] FAIL:', rp, e.message);
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend static files in production mode
if (isProduction) {
  app.use(express.static(distPath));
  // SPA fallback — all non-API routes serve index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use(errorHandler);

app.listen(PORT, async () => {
  console.log('[RYcode API] Running on http://localhost:' + PORT);
  await ensureDefaultUser();
});

export default app;
