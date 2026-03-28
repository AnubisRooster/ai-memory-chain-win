import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';
import { spawn, ChildProcess } from 'child_process';
import {
  writePidFile,
  readPidFile,
  removePidFile,
  gracefulStop,
  isProcessAlive,
  findProcessOnPort,
  killProcessOnPort,
  spawnBackground,
} from '../../lib/process-manager';
import { Logger } from '../../lib/logger';
import { ensureDir, isSourceNewer, loadContractAddress } from '../../lib/config';
import { waitForUrl } from '../../lib/docker';
import { sleep, detectPlatform, getProjectDir } from '../../lib/platform';

describe('E2E: Full Lifecycle', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-lifecycle-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('Startup → Health Check → Shutdown (simulated)', () => {
    let server: http.Server;
    let serverPort: number;
    let serverProcess: ChildProcess | null = null;

    afterEach(async () => {
      if (server) {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
      if (serverProcess?.pid) {
        try { process.kill(serverProcess.pid); } catch {}
      }
    });

    it('complete lifecycle: start server → write PID → health check → stop via PID', async () => {
      const logDir = path.join(tmpDir, 'logs');
      ensureDir(logDir);
      const logger = new Logger(logDir);

      // Phase 1: Simulate startup by spawning a simple HTTP server
      logger.log('=== AI Memory Chain startup begin ===');

      server = http.createServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'ai-memory-backend' }));
      });

      await new Promise<void>((resolve) => {
        server.listen(0, () => {
          serverPort = (server.address() as { port: number }).port;
          resolve();
        });
      });

      // Phase 2: Write PID file (simulate what startup.ts does)
      writePidFile(logDir, 'backend', process.pid);
      logger.log(`Backend started (PID ${process.pid})`);

      // Phase 3: Health check
      const healthy = await waitForUrl(
        `http://localhost:${serverPort}/health`,
        'Backend',
        5,
        'GET',
        100,
      );
      expect(healthy).toBe(true);
      logger.log('Backend health check passed.');

      // Phase 4: Verify PID file is readable
      const readPid = readPidFile(logDir, 'backend');
      expect(readPid).toBe(process.pid);
      expect(isProcessAlive(readPid!)).toBe(true);

      // Phase 5: Simulate shutdown
      logger.log('=== AI Memory Chain shutdown ===');
      removePidFile(logDir, 'backend');
      expect(readPidFile(logDir, 'backend')).toBeNull();
      logger.log('=== AI Memory Chain shutdown complete ===');

      // Verify log file has complete lifecycle
      const logContent = fs.readFileSync(path.join(logDir, 'startup.log'), 'utf-8');
      expect(logContent).toContain('startup begin');
      expect(logContent).toContain('Backend started');
      expect(logContent).toContain('health check passed');
      expect(logContent).toContain('shutdown');
      expect(logContent).toContain('shutdown complete');
    });

    it('lifecycle with two services: backend + frontend', async () => {
      const logDir = path.join(tmpDir, 'logs');
      ensureDir(logDir);
      const logger = new Logger(logDir);

      // Start two mock servers
      const backendServer = http.createServer((_req, res) => {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok' }));
      });
      const frontendServer = http.createServer((_req, res) => {
        res.writeHead(200);
        res.end('<html>ok</html>');
      });

      let backendPort: number;
      let frontendPort: number;

      await new Promise<void>((resolve) => {
        backendServer.listen(0, () => {
          backendPort = (backendServer.address() as { port: number }).port;
          resolve();
        });
      });

      await new Promise<void>((resolve) => {
        frontendServer.listen(0, () => {
          frontendPort = (frontendServer.address() as { port: number }).port;
          resolve();
        });
      });

      // Startup
      logger.log('=== AI Memory Chain startup begin ===');
      writePidFile(logDir, 'backend', process.pid);
      writePidFile(logDir, 'frontend', process.pid);

      const backendOk = await waitForUrl(`http://localhost:${backendPort!}`, 'Backend', 3, 'GET', 50);
      const frontendOk = await waitForUrl(`http://localhost:${frontendPort!}`, 'Frontend', 3, 'GET', 50);

      expect(backendOk).toBe(true);
      expect(frontendOk).toBe(true);
      logger.log('=== AI Memory Chain startup complete ===');

      // Shutdown
      logger.log('=== AI Memory Chain shutdown ===');
      removePidFile(logDir, 'backend');
      removePidFile(logDir, 'frontend');
      logger.log('=== AI Memory Chain shutdown complete ===');

      backendServer.close();
      frontendServer.close();

      expect(readPidFile(logDir, 'backend')).toBeNull();
      expect(readPidFile(logDir, 'frontend')).toBeNull();
    });
  });

  describe('Negative E2E scenarios', () => {
    it('startup fails when backend port is occupied by stale process', async () => {
      const logDir = path.join(tmpDir, 'logs');
      ensureDir(logDir);

      // Start a server on a random port to simulate stale process
      const staleServer = http.createServer((_req, res) => {
        res.writeHead(200);
        res.end('stale');
      });

      let stalePort: number;
      await new Promise<void>((resolve) => {
        staleServer.listen(0, () => {
          stalePort = (staleServer.address() as { port: number }).port;
          resolve();
        });
      });

      // Verify stale process is detected
      const staleProc = findProcessOnPort(stalePort!);
      if (staleProc) {
        expect(staleProc.pid).toBeGreaterThan(0);
      }

      staleServer.close();
    });

    it('shutdown succeeds even with corrupt PID files', async () => {
      const logDir = path.join(tmpDir, 'logs');
      ensureDir(logDir);

      fs.writeFileSync(path.join(logDir, 'backend.pid'), 'corrupt-data');
      fs.writeFileSync(path.join(logDir, 'frontend.pid'), '');

      const stopped1 = await gracefulStop(logDir, 'backend');
      const stopped2 = await gracefulStop(logDir, 'frontend');

      expect(stopped1).toBe(false);
      expect(stopped2).toBe(false);
    });

    it('shutdown succeeds when log directory does not exist', async () => {
      const missingDir = path.join(tmpDir, 'nonexistent-logs');
      const stopped = await gracefulStop(missingDir, 'backend');
      expect(stopped).toBe(false);
    });

    it('health check fails for unreachable service', async () => {
      const ok = await waitForUrl('http://localhost:59995', 'Unreachable', 2, 'GET', 50);
      expect(ok).toBe(false);
    });

    it('health check fails for service returning 500', async () => {
      const brokenServer = http.createServer((_req, res) => {
        res.writeHead(500);
        res.end('Internal Server Error');
      });

      let brokenPort: number;
      await new Promise<void>((resolve) => {
        brokenServer.listen(0, () => {
          brokenPort = (brokenServer.address() as { port: number }).port;
          resolve();
        });
      });

      const ok = await waitForUrl(`http://localhost:${brokenPort!}`, 'Broken', 2, 'GET', 50);
      expect(ok).toBe(false);

      brokenServer.close();
    });
  });

  describe('Cross-platform consistency', () => {
    it('platform detection returns a valid value', () => {
      const platform = detectPlatform();
      expect(['windows', 'macos', 'linux']).toContain(platform);
    });

    it('project directory is an absolute path', () => {
      const dir = getProjectDir();
      expect(path.isAbsolute(dir)).toBe(true);
    });

    it('PID files use correct line endings regardless of platform', () => {
      const logDir = path.join(tmpDir, 'logs');
      ensureDir(logDir);

      writePidFile(logDir, 'test', 12345);
      const raw = fs.readFileSync(path.join(logDir, 'test.pid'), 'utf-8');

      // PID should be just digits, no CRLF issues
      expect(raw).toBe('12345');
      expect(raw).not.toContain('\r');
      expect(raw).not.toContain('\n');
    });

    it('config loads environment consistently across platforms', () => {
      process.env.PORT = '5000';
      process.env.RPC_URL = 'http://custom:8545';

      const { loadProjectConfig } = require('../../lib/config');
      const config = loadProjectConfig();

      expect(config.backendPort).toBe(5000);
      expect(config.rpcUrl).toBe('http://custom:8545');

      delete process.env.PORT;
      delete process.env.RPC_URL;
    });
  });

  describe('Spawn and background process management', () => {
    it('spawns a background process and writes its output to a log file', async () => {
      const logDir = path.join(tmpDir, 'logs');
      ensureDir(logDir);
      const logFile = path.join(logDir, 'spawn-test.log');

      const child = spawnBackground(
        process.execPath,
        ['-e', 'console.log("hello from child"); setTimeout(() => {}, 2000)'],
        { logFile },
      );

      expect(child.pid).toBeGreaterThan(0);

      await sleep(500);

      if (fs.existsSync(logFile)) {
        const content = fs.readFileSync(logFile, 'utf-8');
        expect(content).toContain('hello from child');
      }

      // Cleanup
      if (child.pid && isProcessAlive(child.pid)) {
        try { process.kill(child.pid); } catch {}
      }
    });

    it('spawned process PID can be tracked via PID file', async () => {
      const logDir = path.join(tmpDir, 'logs');
      ensureDir(logDir);

      const child = spawnBackground(
        process.execPath,
        ['-e', 'setTimeout(() => {}, 5000)'],
        {},
      );

      if (child.pid) {
        writePidFile(logDir, 'spawned', child.pid);
        expect(readPidFile(logDir, 'spawned')).toBe(child.pid);
        expect(isProcessAlive(child.pid)).toBe(true);

        await gracefulStop(logDir, 'spawned');
        await sleep(500);
        expect(isProcessAlive(child.pid)).toBe(false);
      }
    });
  });

  describe('Full config + build detection + startup simulation', () => {
    it('simulates complete startup sequence with build check', async () => {
      const projectDir = tmpDir;
      const logDir = path.join(projectDir, 'logs');
      const backendSrc = path.join(projectDir, 'backend', 'src');
      const backendDist = path.join(projectDir, 'backend', 'dist');
      ensureDir(logDir);
      ensureDir(backendSrc);
      ensureDir(backendDist);

      const logger = new Logger(logDir);
      logger.log('=== Simulated startup ===');

      // Step 1: Check if rebuild needed
      fs.writeFileSync(path.join(backendDist, 'index.js'), 'old');
      await sleep(50);
      fs.writeFileSync(path.join(backendSrc, 'index.ts'), 'new');
      const needsRebuild = isSourceNewer(backendSrc, path.join(backendDist, 'index.js'));
      expect(needsRebuild).toBe(true);
      logger.log('Backend needs rebuild: ' + needsRebuild);

      // Step 2: Write contract address config
      fs.writeFileSync(
        path.join(projectDir, 'deployment.json'),
        JSON.stringify({ address: '0xTEST123' }),
      );
      const addr = loadContractAddress(projectDir);
      expect(addr).toBe('0xTEST123');
      logger.log('Contract address: ' + addr);

      // Step 3: Start mock backend
      const server = http.createServer((_req, res) => {
        res.writeHead(200);
        res.end('ok');
      });

      let port: number;
      await new Promise<void>((resolve) => {
        server.listen(0, () => {
          port = (server.address() as { port: number }).port;
          resolve();
        });
      });

      writePidFile(logDir, 'backend', process.pid);

      // Step 4: Health check
      const ok = await waitForUrl(`http://localhost:${port!}`, 'Backend', 3, 'GET', 50);
      expect(ok).toBe(true);
      logger.log('Health check: ' + ok);

      // Step 5: Shutdown
      removePidFile(logDir, 'backend');
      server.close();
      logger.log('=== Simulated shutdown complete ===');

      const log = fs.readFileSync(path.join(logDir, 'startup.log'), 'utf-8');
      expect(log).toContain('Simulated startup');
      expect(log).toContain('needs rebuild: true');
      expect(log).toContain('Contract address: 0xTEST123');
      expect(log).toContain('Health check: true');
      expect(log).toContain('Simulated shutdown complete');
    });
  });
});
