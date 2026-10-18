import 'dotenv/config';
import express from 'express';

const PORT = Number(process.env.PORT || 3000);

async function startServer() {
  // Load .env before importing the database manager; this preserves local development behavior.
  const { app, dbManager } = await import('./src/server/app.ts');
  await dbManager.waitUntilInitialized();

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Reading Assessment System running at http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('❌ Reading Assessment System failed to start:', error);
  process.exitCode = 1;
});
