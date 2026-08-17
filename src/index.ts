import { timingSafeEqual } from 'node:crypto';

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, { type Request, type Response } from 'express';

import { createFioMcpServer } from './server.js';

function isAuthorized(req: Request, expectedToken: string): boolean {
  const header = req.headers.authorization ?? '';
  const prefix = 'Bearer ';
  if (!header.startsWith(prefix)) {
    return false;
  }

  const provided = Buffer.from(header.slice(prefix.length));
  const expected = Buffer.from(expectedToken);
  if (provided.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(provided, expected);
}

function requireBearer(expectedToken: string) {
  return (req: Request, res: Response, next: () => void): void => {
    if (req.path === '/' || req.path === '/health') {
      next();
      return;
    }

    if (!isAuthorized(req, expectedToken)) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    next();
  };
}

async function handleMcp(req: Request, res: Response): Promise<void> {
  try {
    const server = createFioMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP request failed', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
}

function main(): void {
  const authToken = process.env.MCP_AUTH_TOKEN?.trim();
  if (!authToken) {
    console.error('MCP_AUTH_TOKEN is required');
    process.exit(1);
  }

  if (!process.env.FIO_API_TOKEN?.trim()) {
    console.error('Warning: FIO_API_TOKEN is not set; transaction tools will fail until it is.');
  }

  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(requireBearer(authToken));

  app.get('/', (_req, res) => {
    res.type('text/plain').send('fio-bank-mcp');
  });

  app.get('/health', (_req, res) => {
    res.type('text/plain').send('ok');
  });

  app.post('/mcp', (req, res) => {
    void handleMcp(req, res);
  });

  app.get('/mcp', (_req, res) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'SSE streams not supported — use POST for stateless requests',
      },
      id: null,
    });
  });

  const port = Number.parseInt(process.env.PORT ?? '8000', 10);
  app.listen(port, '0.0.0.0', () => {
    console.error(`FIO Bank MCP listening on :${port}/mcp`);
  });
}

main();
