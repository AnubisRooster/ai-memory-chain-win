import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import {
  writePidFile,
  readPidFile,
  removePidFile,
  gracefulStop,
  isProcessAlive,
  findProcessOnPort,
  killProcessOnPort,
} from '../../lib/process-manager';
import { Logger } from '../../lib/logger';
import { ensureDir } from '../../lib/config';
import { sleep } from '../../lib/platform';

describe('Shutdown Flow Integration', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shutdown-int-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('PID-based shutdown', () => {
    it('stops a running process via PID file', async () => {
      const logDir = path.join(tmpDir, 'logs');
      ensureDir(logDir);

      // Start a dummy process
      const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      const pid = child.pid!;
      writePidFile(logDir, 'test-svc', pid);

      expect(isProcessAlive(pid)).toBe(true);

      const stopped = await gracefulStop(logDir, 'test-svc');
      expect(stopped).toBe(true);

      await sleep(500);
      expect(isProcessAlive(pid)).toBe(false);
      expect(readPidFile(logDir, 'test-svc')).toBeNull();
    });

    it('handles graceful stop when process is already dead', async () => {
      const logDir = path.join(tmpDir, 'logs');
      ensureDir(logDir);

      // Write a PID for a non-existent process
      writePidFile(logDir, 'dead-svc', 999999);

      const stopped = await gracefulStop(logDir, 'dead-svc');
      expect(stopped).toBe(false);
      expect(readPidFile(logDir, 'dead-svc')).toBeNull();
    });

    it('handles graceful stop when PID file is missing', async () => {
      const logDir = path.join(tmpDir, 'logs');
      ensureDir(logDir);

      const stopped = await gracefulStop(logDir, 'nonexistent');
      expect(stopped).toBe(false);
    });

    it('handles graceful stop when PID file contains garbage', async () => {
      const logDir = path.join(tmpDir, 'logs');
      ensureDir(logDir);

      fs.writeFileSync(path.join(logDir, 'garbled.pid'), 'not-a-pid');
      const stopped = await gracefulStop(logDir, 'garbled');
      expect(stopped).toBe(false);
    });
  });

  describe('Multi-service shutdown', () => {
    it('stops both backend and frontend processes', async () => {
      const logDir = path.join(tmpDir, 'logs');
      ensureDir(logDir);

      const child1 = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], {
        detached: true,
        stdio: 'ignore',
      });
      child1.unref();

      const child2 = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], {
        detached: true,
        stdio: 'ignore',
      });
      child2.unref();

      writePidFile(logDir, 'backend', child1.pid!);
      writePidFile(logDir, 'frontend', child2.pid!);

      expect(isProcessAlive(child1.pid!)).toBe(true);
      expect(isProcessAlive(child2.pid!)).toBe(true);

      await gracefulStop(logDir, 'backend');
      await gracefulStop(logDir, 'frontend');

      await sleep(500);
      expect(isProcessAlive(child1.pid!)).toBe(false);
      expect(isProcessAlive(child2.pid!)).toBe(false);
    });

    it('continues shutdown even if first service fails', async () => {
      const logDir = path.join(tmpDir, 'logs');
      ensureDir(logDir);

      writePidFile(logDir, 'backend', 999999);

      const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      writePidFile(logDir, 'frontend', child.pid!);

      await gracefulStop(logDir, 'backend');
      const stopped = await gracefulStop(logDir, 'frontend');

      expect(stopped).toBe(true);
      await sleep(500);
      expect(isProcessAlive(child.pid!)).toBe(false);
    });
  });

  describe('Port-based cleanup', () => {
    it('returns false when no process is on the port', async () => {
      const killed = await killProcessOnPort(59996);
      expect(killed).toBe(false);
    });
  });

  describe('Shutdown logging', () => {
    it('logs shutdown sequence messages', () => {
      const logDir = path.join(tmpDir, 'logs');
      const logger = new Logger(logDir);

      logger.log('=== AI Memory Chain shutdown ===');
      logger.log('Stopped backend via PID file.');
      logger.log('Stopped frontend via PID file.');
      logger.log('=== AI Memory Chain shutdown complete ===');

      const content = fs.readFileSync(path.join(logDir, 'startup.log'), 'utf-8');
      expect(content).toContain('shutdown');
      expect(content).toContain('Stopped backend');
      expect(content).toContain('Stopped frontend');
      expect(content).toContain('shutdown complete');
    });
  });
});
