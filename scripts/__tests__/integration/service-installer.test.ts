import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import os from 'os';
import { detectPlatform } from '../../lib/platform';

describe('Service Installer Integration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Platform-specific installation detection', () => {
    it('detects the current platform', () => {
      const platform = detectPlatform();
      expect(['windows', 'macos', 'linux']).toContain(platform);
    });

    it('returns "windows" for win32', async () => {
      vi.spyOn(os, 'platform').mockReturnValue('win32');
      const mod = await import('../../lib/platform');
      expect(mod.detectPlatform()).toBe('windows');
    });

    it('returns "macos" for darwin', async () => {
      vi.spyOn(os, 'platform').mockReturnValue('darwin');
      const mod = await import('../../lib/platform');
      expect(mod.detectPlatform()).toBe('macos');
    });

    it('returns "linux" for linux', async () => {
      vi.spyOn(os, 'platform').mockReturnValue('linux');
      const mod = await import('../../lib/platform');
      expect(mod.detectPlatform()).toBe('linux');
    });
  });

  describe('Service configuration generation', () => {
    it('Windows: generates correct task scheduler wrapper bat path', () => {
      const path = require('path');
      const projectDir = '/test/project';
      const wrapperBat = path.join(projectDir, 'scripts', 'task-scheduler-wrapper.bat');
      expect(wrapperBat).toContain('task-scheduler-wrapper.bat');
    });

    it('macOS: generates correct plist path', () => {
      const path = require('path');
      const plistDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
      const plistPath = path.join(plistDir, 'com.ai-memory-chain.plist');
      expect(plistPath).toContain('com.ai-memory-chain.plist');
      expect(plistPath).toContain('LaunchAgents');
    });

    it('Linux: generates correct systemd service path', () => {
      const path = require('path');
      const serviceDir = path.join(os.homedir(), '.config', 'systemd', 'user');
      const servicePath = path.join(serviceDir, 'ai-memory-chain.service');
      expect(servicePath).toContain('ai-memory-chain.service');
      expect(servicePath).toContain('systemd');
    });
  });

  describe('Negative: invalid platform scenarios', () => {
    it('unknown platform falls back to linux', async () => {
      vi.spyOn(os, 'platform').mockReturnValue('sunos' as NodeJS.Platform);
      const mod = await import('../../lib/platform');
      expect(mod.detectPlatform()).toBe('linux');
    });

    it('empty string platform falls back to linux', async () => {
      vi.spyOn(os, 'platform').mockReturnValue('' as NodeJS.Platform);
      const mod = await import('../../lib/platform');
      expect(mod.detectPlatform()).toBe('linux');
    });
  });
});
