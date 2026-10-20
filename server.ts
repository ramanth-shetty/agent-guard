/**
 * AgentGuard Full-Stack Server
 * Express REST API + WebSocket Server + Vite Middleware Integration.
 */

import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import { apiRouter } from './src/server/routes.js';
import { subscribeEvents } from './src/server/store/approvalStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function bootstrapServer() {
  const app = express();
  const server = http.createServer(app);

  // Body parsers
  app.use(express.json({ limit: '64kb' }));
  app.use(express.urlencoded({ extended: true }));

  // WebSocket Server for live events: WS /v1/ws/events
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    if (url.pathname === '/v1/ws/events' || url.pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    // Send welcome payload
    ws.send(JSON.stringify({ type: 'connected', data: { ts: Date.now(), msg: 'Connected to AgentGuard event stream' } }));

    // Keepalive ping
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);

    ws.on('close', () => {
      clearInterval(interval);
    });
  });

  // Relay internal events to all connected WebSocket clients
  subscribeEvents((event) => {
    const payload = JSON.stringify(event);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(payload);
        } catch (e) {
          // ignore dropped client
        }
      }
    }
  });

  // Mount API Router under /v1
  app.use('/v1', apiRouter);

  // Backwards compatibility for root /api calls if requested
  app.use('/api', apiRouter);

  // OpenAPI docs route
  app.get('/docs', (_req, res) => {
    res.redirect('/#api-docs');
  });

  // Mount Vite middleware in development or static in production
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[AgentGuard] Server listening on http://0.0.0.0:${PORT}`);
    console.log(`[AgentGuard] API base: http://localhost:${PORT}/v1`);
    console.log(`[AgentGuard] WebSocket events: ws://localhost:${PORT}/v1/ws/events`);
  });
}

bootstrapServer().catch((err) => {
  console.error('[AgentGuard] Failed to start server:', err);
  process.exit(1);
});
