import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import http from 'http';
import { waitForUrl, isDockerInstalled } from '../../lib/docker';

describe('Docker Utilities', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('waitForUrl', () => {
    let server: http.Server;
    let port: number;

    afterEach(async () => {
      if (server) {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });

    it('returns true when URL responds immediately', async () => {
      server = http.createServer((_req, res) => {
        res.writeHead(200);
        res.end('ok');
      });
      await new Promise<void>((resolve) => {
        server.listen(0, () => {
          port = (server.address() as { port: number }).port;
          resolve();
        });
      });

      const result = await waitForUrl(`http://localhost:${port}`, 'test', 5, 'GET', 100);
      expect(result).toBe(true);
    });

    it('returns true for POST requests when URL responds', async () => {
      server = http.createServer((_req, res) => {
        res.writeHead(200);
        res.end('ok');
      });
      await new Promise<void>((resolve) => {
        server.listen(0, () => {
          port = (server.address() as { port: number }).port;
          resolve();
        });
      });

      const result = await waitForUrl(`http://localhost:${port}`, 'test', 5, 'POST', 100);
      expect(result).toBe(true);
    });

    it('returns false when URL never responds (timeout)', async () => {
      const result = await waitForUrl('http://localhost:59999', 'offline', 2, 'GET', 50);
      expect(result).toBe(false);
    });

    it('returns true even for 4xx responses (server is up)', async () => {
      server = http.createServer((_req, res) => {
        res.writeHead(404);
        res.end('not found');
      });
      await new Promise<void>((resolve) => {
        server.listen(0, () => {
          port = (server.address() as { port: number }).port;
          resolve();
        });
      });

      const result = await waitForUrl(`http://localhost:${port}`, 'test', 5, 'GET', 100);
      expect(result).toBe(true);
    });

    it('returns false for 500 responses', async () => {
      server = http.createServer((_req, res) => {
        res.writeHead(500);
        res.end('error');
      });
      await new Promise<void>((resolve) => {
        server.listen(0, () => {
          port = (server.address() as { port: number }).port;
          resolve();
        });
      });

      const result = await waitForUrl(`http://localhost:${port}`, 'test', 2, 'GET', 50);
      expect(result).toBe(false);
    });

    it('retries and succeeds when server starts late', async () => {
      let requestCount = 0;
      server = http.createServer((_req, res) => {
        requestCount++;
        if (requestCount < 3) {
          res.writeHead(500);
          res.end('not ready');
        } else {
          res.writeHead(200);
          res.end('ok');
        }
      });
      await new Promise<void>((resolve) => {
        server.listen(0, () => {
          port = (server.address() as { port: number }).port;
          resolve();
        });
      });

      const result = await waitForUrl(`http://localhost:${port}`, 'test', 10, 'GET', 50);
      expect(result).toBe(true);
      expect(requestCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('isDockerInstalled', () => {
    it('returns a boolean', () => {
      const result = isDockerInstalled();
      expect(typeof result).toBe('boolean');
    });
  });
});
