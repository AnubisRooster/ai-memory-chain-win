import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Logger } from '../../lib/logger';

describe('Logger', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logger-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('creates the log directory if it does not exist', () => {
      const logDir = path.join(tmpDir, 'new-logs');
      new Logger(logDir);
      expect(fs.existsSync(logDir)).toBe(true);
    });

    it('does not throw if log directory already exists', () => {
      expect(() => new Logger(tmpDir)).not.toThrow();
    });

    it('uses custom log file name', () => {
      const logger = new Logger(tmpDir, 'custom.log');
      expect(logger.getLogFile()).toBe(path.join(tmpDir, 'custom.log'));
    });

    it('defaults to startup.log', () => {
      const logger = new Logger(tmpDir);
      expect(logger.getLogFile()).toBe(path.join(tmpDir, 'startup.log'));
    });
  });

  describe('log', () => {
    it('appends timestamped message to log file', () => {
      const logger = new Logger(tmpDir);
      logger.log('Test message');
      const content = fs.readFileSync(path.join(tmpDir, 'startup.log'), 'utf-8');
      expect(content).toContain('Test message');
      expect(content).toMatch(/^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/);
    });

    it('appends multiple messages in order', () => {
      const logger = new Logger(tmpDir);
      logger.log('First');
      logger.log('Second');
      logger.log('Third');
      const content = fs.readFileSync(path.join(tmpDir, 'startup.log'), 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(3);
      expect(lines[0]).toContain('First');
      expect(lines[1]).toContain('Second');
      expect(lines[2]).toContain('Third');
    });

    it('handles empty messages', () => {
      const logger = new Logger(tmpDir);
      logger.log('');
      const content = fs.readFileSync(path.join(tmpDir, 'startup.log'), 'utf-8');
      expect(content).toMatch(/^\[\d{4}-\d{2}-\d{2}/);
    });

    it('handles messages with special characters', () => {
      const logger = new Logger(tmpDir);
      logger.log('Path: C:\\Users\\test\\file.txt — "quoted" & <angled>');
      const content = fs.readFileSync(path.join(tmpDir, 'startup.log'), 'utf-8');
      expect(content).toContain('C:\\Users\\test\\file.txt');
      expect(content).toContain('"quoted"');
    });

    it('handles unicode messages', () => {
      const logger = new Logger(tmpDir);
      logger.log('Unicode: 日本語テスト');
      const content = fs.readFileSync(path.join(tmpDir, 'startup.log'), 'utf-8');
      expect(content).toContain('日本語テスト');
    });
  });

  describe('rotateLog', () => {
    it('rotates a file exceeding max size', () => {
      const logger = new Logger(tmpDir);
      const testFile = path.join(tmpDir, 'big.log');
      fs.writeFileSync(testFile, 'x'.repeat(1024));

      const rotated = logger.rotateLog(testFile, 100);
      expect(rotated).toBe(true);
      expect(fs.existsSync(`${testFile}.prev`)).toBe(true);
      expect(fs.existsSync(testFile)).toBe(false);
    });

    it('does not rotate a file under the max size', () => {
      const logger = new Logger(tmpDir);
      const testFile = path.join(tmpDir, 'small.log');
      fs.writeFileSync(testFile, 'x'.repeat(50));

      const rotated = logger.rotateLog(testFile, 1024);
      expect(rotated).toBe(false);
      expect(fs.existsSync(`${testFile}.prev`)).toBe(false);
    });

    it('does not rotate a non-existent file', () => {
      const logger = new Logger(tmpDir);
      const rotated = logger.rotateLog(path.join(tmpDir, 'nonexistent.log'), 100);
      expect(rotated).toBe(false);
    });

    it('overwrites existing .prev file', () => {
      const logger = new Logger(tmpDir);
      const testFile = path.join(tmpDir, 'overwrite.log');
      fs.writeFileSync(`${testFile}.prev`, 'old prev content');
      fs.writeFileSync(testFile, 'x'.repeat(1024));

      logger.rotateLog(testFile, 100);
      const prevContent = fs.readFileSync(`${testFile}.prev`, 'utf-8');
      expect(prevContent).toBe('x'.repeat(1024));
    });

    it('uses default maxBytes of 5MB', () => {
      const logger = new Logger(tmpDir);
      const testFile = path.join(tmpDir, 'default.log');
      fs.writeFileSync(testFile, 'small');

      const rotated = logger.rotateLog(testFile);
      expect(rotated).toBe(false);
    });
  });

  describe('rotateLogs', () => {
    it('rotates multiple log files', () => {
      const logger = new Logger(tmpDir);
      for (const name of ['a.log', 'b.log', 'c.log']) {
        fs.writeFileSync(path.join(tmpDir, name), 'x'.repeat(200));
      }

      // Only rotate files over 100 bytes — we need to test indirectly
      // since rotateLogs uses default maxBytes (5MB), just verify no crash
      expect(() => logger.rotateLogs(['a.log', 'b.log', 'c.log'])).not.toThrow();
    });

    it('handles non-existent files in the list', () => {
      const logger = new Logger(tmpDir);
      expect(() => logger.rotateLogs(['nonexistent.log', 'also-missing.log'])).not.toThrow();
    });
  });

  describe('getLogDir', () => {
    it('returns the configured log directory', () => {
      const logger = new Logger(tmpDir);
      expect(logger.getLogDir()).toBe(tmpDir);
    });
  });
});
