import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import os from 'os';

let platform: typeof import('../../lib/platform');

describe('Platform Detection', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('detectPlatform', () => {
    it('returns "windows" on win32', async () => {
      vi.spyOn(os, 'platform').mockReturnValue('win32');
      platform = await import('../../lib/platform');
      expect(platform.detectPlatform()).toBe('windows');
    });

    it('returns "macos" on darwin', async () => {
      vi.spyOn(os, 'platform').mockReturnValue('darwin');
      platform = await import('../../lib/platform');
      expect(platform.detectPlatform()).toBe('macos');
    });

    it('returns "linux" on linux', async () => {
      vi.spyOn(os, 'platform').mockReturnValue('linux');
      platform = await import('../../lib/platform');
      expect(platform.detectPlatform()).toBe('linux');
    });

    it('returns "linux" for unknown platforms (fallback)', async () => {
      vi.spyOn(os, 'platform').mockReturnValue('freebsd' as NodeJS.Platform);
      platform = await import('../../lib/platform');
      expect(platform.detectPlatform()).toBe('linux');
    });
  });

  describe('isWindows', () => {
    it('returns true on win32', async () => {
      vi.spyOn(os, 'platform').mockReturnValue('win32');
      platform = await import('../../lib/platform');
      expect(platform.isWindows()).toBe(true);
    });

    it('returns false on darwin', async () => {
      vi.spyOn(os, 'platform').mockReturnValue('darwin');
      platform = await import('../../lib/platform');
      expect(platform.isWindows()).toBe(false);
    });

    it('returns false on linux', async () => {
      vi.spyOn(os, 'platform').mockReturnValue('linux');
      platform = await import('../../lib/platform');
      expect(platform.isWindows()).toBe(false);
    });
  });

  describe('isMacOS', () => {
    it('returns true on darwin', async () => {
      vi.spyOn(os, 'platform').mockReturnValue('darwin');
      platform = await import('../../lib/platform');
      expect(platform.isMacOS()).toBe(true);
    });

    it('returns false on win32', async () => {
      vi.spyOn(os, 'platform').mockReturnValue('win32');
      platform = await import('../../lib/platform');
      expect(platform.isMacOS()).toBe(false);
    });
  });

  describe('isLinux', () => {
    it('returns true on linux', async () => {
      vi.spyOn(os, 'platform').mockReturnValue('linux');
      platform = await import('../../lib/platform');
      expect(platform.isLinux()).toBe(true);
    });

    it('returns false on darwin', async () => {
      vi.spyOn(os, 'platform').mockReturnValue('darwin');
      platform = await import('../../lib/platform');
      expect(platform.isLinux()).toBe(false);
    });
  });

  describe('sleep', () => {
    it('resolves after the specified duration', async () => {
      platform = await import('../../lib/platform');
      const start = Date.now();
      await platform.sleep(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(40);
      expect(elapsed).toBeLessThan(200);
    });

    it('resolves immediately for 0ms', async () => {
      platform = await import('../../lib/platform');
      const start = Date.now();
      await platform.sleep(0);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('getFileSize', () => {
    it('returns 0 for non-existent file', async () => {
      platform = await import('../../lib/platform');
      expect(platform.getFileSize('/nonexistent/path/file.txt')).toBe(0);
    });

    it('returns correct size for existing file', async () => {
      platform = await import('../../lib/platform');
      const size = platform.getFileSize(__filename);
      expect(size).toBeGreaterThan(0);
    });
  });

  describe('getProjectDir', () => {
    it('returns a valid directory path', async () => {
      platform = await import('../../lib/platform');
      const dir = platform.getProjectDir();
      expect(typeof dir).toBe('string');
      expect(dir.length).toBeGreaterThan(0);
    });

    it('does not contain trailing separator', async () => {
      platform = await import('../../lib/platform');
      const dir = platform.getProjectDir();
      expect(dir.endsWith('/') || dir.endsWith('\\')).toBe(false);
    });
  });

  describe('findExecutable (negative)', () => {
    it('returns the name itself when executable is not found', async () => {
      platform = await import('../../lib/platform');
      const result = platform.findExecutable('zzz_nonexistent_binary_12345', []);
      expect(result).toBe('zzz_nonexistent_binary_12345');
    });

    it('returns fallback path when it exists', async () => {
      platform = await import('../../lib/platform');
      const result = platform.findExecutable('zzz_nonexistent_binary_12345', [__filename]);
      expect(result).toBe(__filename);
    });

    it('skips non-existent fallback paths', async () => {
      platform = await import('../../lib/platform');
      const result = platform.findExecutable('zzz_nonexistent_binary_12345', [
        '/absolutely/fake/path',
        '/another/fake/path',
      ]);
      expect(result).toBe('zzz_nonexistent_binary_12345');
    });
  });

  describe('getDockerPath', () => {
    it('returns a string', async () => {
      platform = await import('../../lib/platform');
      const dockerPath = platform.getDockerPath();
      expect(typeof dockerPath).toBe('string');
      expect(dockerPath.length).toBeGreaterThan(0);
    });
  });

  describe('getNodePath', () => {
    it('returns a path that contains "node"', async () => {
      platform = await import('../../lib/platform');
      const nodePath = platform.getNodePath();
      expect(nodePath.toLowerCase()).toContain('node');
    });
  });

  describe('getNpxPath', () => {
    it('returns a path that contains "npx"', async () => {
      platform = await import('../../lib/platform');
      const npxPath = platform.getNpxPath();
      expect(npxPath.toLowerCase()).toContain('npx');
    });
  });
});
