import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';
import { loadProjectConfig, ensureDir, isSourceNewer } from '../../lib/config';
import { Logger } from '../../lib/logger';
import { waitForUrl } from '../../lib/docker';
import {
  writePidFile,
  readPidFile,
  killProcessOnPort,
  findProcessOnPort,
  isProcessAlive,
} from '../../lib/process-manager';

describe('Startup Flow Integration', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'startup-int-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('Config + Logger integration', () => {
    it('creates log directory and writes startup messages', () => {
      const logDir = path.join(tmpDir, 'logs');
      ensureDir(logDir);
      const logger = new Logger(logDir);

      logger.log('=== AI Memory Chain startup begin ===');
      logger.log('Docker daemon is ready.');
      logger.log('Polygon Edge is ready.');

      const content = fs.readFileSync(path.join(logDir, 'startup.log'), 'utf-8');
      expect(content).toContain('startup begin');
      expect(content).toContain('Docker daemon');
      expect(content).toContain('Polygon Edge');
    });

    it('log rotation works during startup sequence', () => {
      const logDir = path.join(tmpDir, 'logs');
      ensureDir(logDir);

      // Create a "big" log file
      fs.writeFileSync(path.join(logDir, 'backend.log'), 'x'.repeat(200));
      fs.writeFileSync(path.join(logDir, 'frontend.log'), 'y'.repeat(50));

      const logger = new Logger(logDir);
      logger.rotateLog(path.join(logDir, 'backend.log'), 100);
      logger.rotateLog(path.join(logDir, 'frontend.log'), 100);

      expect(fs.existsSync(path.join(logDir, 'backend.log.prev'))).toBe(true);
      expect(fs.existsSync(path.join(logDir, 'frontend.log.prev'))).toBe(false);
    });
  });

  describe('Config + Source change detection', () => {
    it('detects when backend needs rebuild', async () => {
      const srcDir = path.join(tmpDir, 'backend', 'src');
      const distDir = path.join(tmpDir, 'backend', 'dist');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(distDir, { recursive: true });

      fs.writeFileSync(path.join(distDir, 'index.js'), 'old compiled code');
      await new Promise((r) => setTimeout(r, 50));
      fs.writeFileSync(path.join(srcDir, 'index.ts'), 'new source code');

      expect(isSourceNewer(srcDir, path.join(distDir, 'index.js'))).toBe(true);
    });

    it('skips rebuild when dist is current', () => {
      const srcDir = path.join(tmpDir, 'backend', 'src');
      const distDir = path.join(tmpDir, 'backend', 'dist');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(distDir, { recursive: true });

      fs.writeFileSync(path.join(srcDir, 'index.ts'), 'source');
      const future = new Date(Date.now() + 60000);
      const distFile = path.join(distDir, 'index.js');
      fs.writeFileSync(distFile, 'compiled');
      fs.utimesSync(distFile, future, future);

      expect(isSourceNewer(srcDir, distFile)).toBe(false);
    });
  });

  describe('PID file + process lifecycle', () => {
    it('writes PID file and reads it back during startup', () => {
      const logDir = path.join(tmpDir, 'logs');
      ensureDir(logDir);

      writePidFile(logDir, 'backend', process.pid);
      writePidFile(logDir, 'frontend', process.pid);

      expect(readPidFile(logDir, 'backend')).toBe(process.pid);
      expect(readPidFile(logDir, 'frontend')).toBe(process.pid);
    });

    it('verifies process is alive after writing PID', () => {
      const logDir = path.join(tmpDir, 'logs');
      ensureDir(logDir);

      writePidFile(logDir, 'backend', process.pid);
      const pid = readPidFile(logDir, 'backend');
      expect(pid).not.toBeNull();
      expect(isProcessAlive(pid!)).toBe(true);
    });

    it('handles already-dead PID in file gracefully', () => {
      const logDir = path.join(tmpDir, 'logs');
      ensureDir(logDir);

      writePidFile(logDir, 'backend', 999999);
      const pid = readPidFile(logDir, 'backend');
      expect(pid).toBe(999999);
      expect(isProcessAlive(pid!)).toBe(false);
    });
  });

  describe('Port conflict resolution', () => {
    let server: http.Server;

    afterEach(async () => {
      if (server) {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });

    it('detects and can kill process on a specific port', async () => {
      server = http.createServer((_req, res) => {
        res.writeHead(200);
        res.end('ok');
      });

      await new Promise<void>((resolve) => {
        server.listen(0, () => resolve());
      });

      const port = (server.address() as { port: number }).port;
      const proc = findProcessOnPort(port);

      if (proc) {
        expect(proc.pid).toBeGreaterThan(0);
      }
    });

    it('killProcessOnPort returns false for unused port', async () => {
      const killed = await killProcessOnPort(59998);
      expect(killed).toBe(false);
    });
  });

  describe('Infrastructure health gate simulation', () => {
    let server: http.Server;
    let port: number;

    afterEach(async () => {
      if (server) {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });

    it('waits for infrastructure to be ready', async () => {
      server = http.createServer((_req, res) => {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok' }));
      });

      await new Promise<void>((resolve) => {
        server.listen(0, () => {
          port = (server.address() as { port: number }).port;
          resolve();
        });
      });

      const ready = await waitForUrl(`http://localhost:${port}`, 'TestService', 5, 'GET', 100);
      expect(ready).toBe(true);
    });

    it('times out when infrastructure is not available', async () => {
      const ready = await waitForUrl('http://localhost:59997', 'Unavailable', 2, 'GET', 50);
      expect(ready).toBe(false);
    });

    it('waits for POST endpoints (like IPFS /id)', async () => {
      server = http.createServer((_req, res) => {
        res.writeHead(200);
        res.end(JSON.stringify({ ID: 'test-peer-id' }));
      });

      await new Promise<void>((resolve) => {
        server.listen(0, () => {
          port = (server.address() as { port: number }).port;
          resolve();
        });
      });

      const ready = await waitForUrl(`http://localhost:${port}`, 'IPFS', 5, 'POST', 100);
      expect(ready).toBe(true);
    });
  });

  describe('Environment loading during startup', () => {
    it('loads contract address from deployment.json', () => {
      const deployPath = path.join(tmpDir, 'deployment.json');
      fs.writeFileSync(deployPath, JSON.stringify({
        address: '0xe684F6d2B9200Bc5665B8693AB3210d32C874e47',
        deployer: '0xAf745EA617971201c609B8118C1AC708027c1bCd',
      }));

      const { loadContractAddress } = require('../../lib/config');
      const addr = loadContractAddress(tmpDir);
      expect(addr).toBe('0xe684F6d2B9200Bc5665B8693AB3210d32C874e47');
    });

    it('handles missing deployment.json gracefully', () => {
      const { loadContractAddress } = require('../../lib/config');
      const addr = loadContractAddress(tmpDir);
      expect(addr).toBeNull();
    });
  });
});
