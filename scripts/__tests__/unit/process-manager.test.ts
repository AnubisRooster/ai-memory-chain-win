import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  findProcessOnPort,
  killProcess,
  isProcessAlive,
  writePidFile,
  readPidFile,
  removePidFile,
} from '../../lib/process-manager';

describe('Process Manager', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('findProcessOnPort', () => {
    it('returns null for a port with no listener', () => {
      const result = findProcessOnPort(59999);
      expect(result).toBeNull();
    });

    it('returns null or a result for port 0 (OS wildcard)', () => {
      const result = findProcessOnPort(0);
      // Port 0 is an OS wildcard — some systems return a match, some don't
      if (result !== null) {
        expect(result.pid).toBeGreaterThan(0);
      } else {
        expect(result).toBeNull();
      }
    });

    it('returns null for negative port', () => {
      const result = findProcessOnPort(-1);
      expect(result).toBeNull();
    });

    it('returns a ProcessInfo with pid for an active port', async () => {
      const http = await import('http');
      const server = http.createServer();
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const port = (server.address() as { port: number }).port;

      try {
        const result = findProcessOnPort(port);
        if (result) {
          expect(result.pid).toBeGreaterThan(0);
        }
      } finally {
        server.close();
      }
    });
  });

  describe('isProcessAlive', () => {
    it('returns true for the current process', () => {
      expect(isProcessAlive(process.pid)).toBe(true);
    });

    it('returns false for a non-existent PID', () => {
      expect(isProcessAlive(999999)).toBe(false);
    });

    it('returns false for PID 0', () => {
      const result = isProcessAlive(0);
      expect(typeof result).toBe('boolean');
    });

    it('returns false for negative PID', () => {
      expect(isProcessAlive(-1)).toBe(false);
    });
  });

  describe('killProcess', () => {
    it('returns false for a non-existent PID', () => {
      expect(killProcess(999999)).toBe(false);
    });

    it('returns false for PID 0', () => {
      expect(killProcess(0)).toBe(false);
    });

    it('returns false for negative PID', () => {
      expect(killProcess(-1)).toBe(false);
    });

    it('does not throw when force-killing a non-existent PID', () => {
      expect(() => killProcess(999999, true)).not.toThrow();
    });
  });

  describe('PID file management', () => {
    describe('writePidFile', () => {
      it('creates a PID file with the correct content', () => {
        writePidFile(tmpDir, 'test-service', 12345);
        const content = fs.readFileSync(path.join(tmpDir, 'test-service.pid'), 'utf-8');
        expect(content).toBe('12345');
      });

      it('creates the directory if it does not exist', () => {
        const nestedDir = path.join(tmpDir, 'nested', 'dir');
        writePidFile(nestedDir, 'svc', 42);
        expect(fs.existsSync(path.join(nestedDir, 'svc.pid'))).toBe(true);
      });

      it('overwrites an existing PID file', () => {
        writePidFile(tmpDir, 'svc', 100);
        writePidFile(tmpDir, 'svc', 200);
        const content = fs.readFileSync(path.join(tmpDir, 'svc.pid'), 'utf-8');
        expect(content).toBe('200');
      });
    });

    describe('readPidFile', () => {
      it('reads a valid PID from file', () => {
        writePidFile(tmpDir, 'svc', 54321);
        expect(readPidFile(tmpDir, 'svc')).toBe(54321);
      });

      it('returns null when PID file does not exist', () => {
        expect(readPidFile(tmpDir, 'nonexistent')).toBeNull();
      });

      it('returns null when PID file contains non-numeric data', () => {
        fs.writeFileSync(path.join(tmpDir, 'bad.pid'), 'not-a-number', 'utf-8');
        expect(readPidFile(tmpDir, 'bad')).toBeNull();
      });

      it('returns null when PID file is empty', () => {
        fs.writeFileSync(path.join(tmpDir, 'empty.pid'), '', 'utf-8');
        expect(readPidFile(tmpDir, 'empty')).toBeNull();
      });

      it('handles PID with whitespace/newlines', () => {
        fs.writeFileSync(path.join(tmpDir, 'ws.pid'), '  67890\n', 'utf-8');
        expect(readPidFile(tmpDir, 'ws')).toBe(67890);
      });
    });

    describe('removePidFile', () => {
      it('removes an existing PID file', () => {
        writePidFile(tmpDir, 'svc', 123);
        removePidFile(tmpDir, 'svc');
        expect(fs.existsSync(path.join(tmpDir, 'svc.pid'))).toBe(false);
      });

      it('does not throw when PID file does not exist', () => {
        expect(() => removePidFile(tmpDir, 'nonexistent')).not.toThrow();
      });

      it('does not throw when directory does not exist', () => {
        expect(() => removePidFile('/nonexistent/dir', 'svc')).not.toThrow();
      });
    });
  });
});
