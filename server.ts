import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApiApp } from './server/app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolvePort(): number {
  const portFlagIndex = process.argv.findIndex((arg) => arg === '--port' || arg === '-p');
  if (portFlagIndex !== -1 && process.argv[portFlagIndex + 1]) {
    const cliPort = Number(process.argv[portFlagIndex + 1]);
    if (Number.isFinite(cliPort) && cliPort > 0) return cliPort;
  }

  const inlinePortArg = process.argv.find((arg) => arg.startsWith('--port='));
  if (inlinePortArg) {
    const cliPort = Number(inlinePortArg.split('=')[1]);
    if (Number.isFinite(cliPort) && cliPort > 0) return cliPort;
  }

  // In development, always default to port 3000 so Cloud Run's PORT=8080 (used by nginx)
  // never causes EADDRINUSE collisions.
  if (process.env.NODE_ENV !== 'production') {
    return 3000;
  }

  return Number(process.env.PORT) || 3000;
}

const PORT = resolvePort();

async function startServer() {
  const app = createApiApp();
  const httpServer = http.createServer(app);

  let viteInstance: { close: () => Promise<void> } | null = null;

  if (process.env.NODE_ENV !== 'production') {
    const viteReady = import('vite').then(async ({ createServer: createViteServer }) => {
      const server = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: false,
          ws: false,
          watch: null,
        },
        appType: 'spa',
      });
      viteInstance = server;
      return server;
    });

    viteReady.catch((err) => {
      console.error('Failed to initialize Vite middleware:', err);
    });

    app.use(async (req, res, next) => {
      try {
        const vite = await viteReady;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.on('error', (err) => {
    console.error(`HTTP server error on port ${PORT}:`, err);
    process.exit(1);
  });

  const shutdown = () => {
    httpServer.close(() => {
      if (viteInstance) {
        void viteInstance.close().finally(() => process.exit(0));
      } else {
        process.exit(0);
      }
    });
    setTimeout(() => process.exit(0), 2000).unref();
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`R.B Law Firm server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
