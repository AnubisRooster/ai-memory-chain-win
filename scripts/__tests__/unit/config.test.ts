import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  loadContractAddress,
  loadDeployerKey,
  loadProjectConfig,
  ensureDir,
  isSourceNewer,
} from '../../lib/config';

describe('Config Module', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
    delete process.env.CONTRACT_ADDRESS;
    delete process.env.DEPLOYER_PRIVATE_KEY;
    delete process.env.RPC_URL;
    delete process.env.PORT;
    delete process.env.FRONTEND_PORT;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('loadContractAddress', () => {
    it('reads address from deployment.json', () => {
      const deployPath = path.join(tmpDir, 'deployment.json');
      fs.writeFileSync(deployPath, JSON.stringify({ address: '0xABC123' }));
      expect(loadContractAddress(tmpDir)).toBe('0xABC123');
    });

    it('prefers CONTRACT_ADDRESS env var over file', () => {
      process.env.CONTRACT_ADDRESS = '0xENV_ADDR';
      const deployPath = path.join(tmpDir, 'deployment.json');
      fs.writeFileSync(deployPath, JSON.stringify({ address: '0xFILE_ADDR' }));
      expect(loadContractAddress(tmpDir)).toBe('0xENV_ADDR');
    });

    it('returns null when deployment.json is missing', () => {
      expect(loadContractAddress(tmpDir)).toBeNull();
    });

    it('returns null when deployment.json is malformed', () => {
      fs.writeFileSync(path.join(tmpDir, 'deployment.json'), 'not valid json');
      expect(loadContractAddress(tmpDir)).toBeNull();
    });

    it('returns null when deployment.json has no address field', () => {
      fs.writeFileSync(path.join(tmpDir, 'deployment.json'), JSON.stringify({ deployer: '0x123' }));
      expect(loadContractAddress(tmpDir)).toBeNull();
    });

    it('returns null when address is empty string', () => {
      fs.writeFileSync(path.join(tmpDir, 'deployment.json'), JSON.stringify({ address: '' }));
      expect(loadContractAddress(tmpDir)).toBeNull();
    });
  });

  describe('loadDeployerKey', () => {
    it('reads key from validator.key file', () => {
      const keyDir = path.join(tmpDir, 'data', 'polygon-edge', 'node1', 'consensus');
      fs.mkdirSync(keyDir, { recursive: true });
      fs.writeFileSync(path.join(keyDir, 'validator.key'), 'abcd1234');
      expect(loadDeployerKey(tmpDir)).toBe('0xabcd1234');
    });

    it('preserves 0x prefix if already present', () => {
      const keyDir = path.join(tmpDir, 'data', 'polygon-edge', 'node1', 'consensus');
      fs.mkdirSync(keyDir, { recursive: true });
      fs.writeFileSync(path.join(keyDir, 'validator.key'), '0xabcd1234');
      expect(loadDeployerKey(tmpDir)).toBe('0xabcd1234');
    });

    it('prefers DEPLOYER_PRIVATE_KEY env var over file', () => {
      process.env.DEPLOYER_PRIVATE_KEY = '0xENV_KEY';
      expect(loadDeployerKey(tmpDir)).toBe('0xENV_KEY');
    });

    it('returns null when key file is missing', () => {
      expect(loadDeployerKey(tmpDir)).toBeNull();
    });

    it('trims whitespace and newlines from key', () => {
      const keyDir = path.join(tmpDir, 'data', 'polygon-edge', 'node1', 'consensus');
      fs.mkdirSync(keyDir, { recursive: true });
      fs.writeFileSync(path.join(keyDir, 'validator.key'), '  abcd1234  \n');
      expect(loadDeployerKey(tmpDir)).toBe('0xabcd1234');
    });
  });

  describe('loadProjectConfig', () => {
    it('returns a valid config object with defaults', () => {
      const config = loadProjectConfig();
      expect(config).toHaveProperty('projectDir');
      expect(config).toHaveProperty('logDir');
      expect(config).toHaveProperty('dataDir');
      expect(config.rpcUrl).toBe('http://127.0.0.1:8545');
      expect(config.backendPort).toBe(3001);
      expect(config.frontendPort).toBe(3000);
    });

    it('respects PORT env var', () => {
      process.env.PORT = '4000';
      const config = loadProjectConfig();
      expect(config.backendPort).toBe(4000);
    });

    it('respects RPC_URL env var', () => {
      process.env.RPC_URL = 'http://custom:9545';
      const config = loadProjectConfig();
      expect(config.rpcUrl).toBe('http://custom:9545');
    });

    it('respects FRONTEND_PORT env var', () => {
      process.env.FRONTEND_PORT = '4001';
      const config = loadProjectConfig();
      expect(config.frontendPort).toBe(4001);
    });
  });

  describe('ensureDir', () => {
    it('creates a directory that does not exist', () => {
      const newDir = path.join(tmpDir, 'new-dir');
      ensureDir(newDir);
      expect(fs.existsSync(newDir)).toBe(true);
    });

    it('creates nested directories', () => {
      const nestedDir = path.join(tmpDir, 'a', 'b', 'c');
      ensureDir(nestedDir);
      expect(fs.existsSync(nestedDir)).toBe(true);
    });

    it('does not throw if directory already exists', () => {
      const existingDir = path.join(tmpDir, 'existing');
      fs.mkdirSync(existingDir);
      expect(() => ensureDir(existingDir)).not.toThrow();
    });
  });

  describe('isSourceNewer', () => {
    it('returns true when dist file does not exist', () => {
      const srcDir = path.join(tmpDir, 'src');
      fs.mkdirSync(srcDir);
      fs.writeFileSync(path.join(srcDir, 'index.ts'), 'console.log("hi")');
      expect(isSourceNewer(srcDir, path.join(tmpDir, 'dist', 'index.js'))).toBe(true);
    });

    it('returns true when source file is newer than dist', async () => {
      const srcDir = path.join(tmpDir, 'src');
      fs.mkdirSync(srcDir);
      const distFile = path.join(tmpDir, 'index.js');
      fs.writeFileSync(distFile, 'old');

      // Ensure a time gap
      await new Promise((r) => setTimeout(r, 50));
      fs.writeFileSync(path.join(srcDir, 'newer.ts'), 'new');

      expect(isSourceNewer(srcDir, distFile)).toBe(true);
    });

    it('returns false when dist is newer than all source files', () => {
      const srcDir = path.join(tmpDir, 'src');
      fs.mkdirSync(srcDir);
      fs.writeFileSync(path.join(srcDir, 'old.ts'), 'old');

      // Write dist after source
      const distFile = path.join(tmpDir, 'index.js');
      const now = new Date();
      const future = new Date(now.getTime() + 10000);
      fs.writeFileSync(distFile, 'compiled');
      fs.utimesSync(distFile, future, future);

      expect(isSourceNewer(srcDir, distFile)).toBe(false);
    });

    it('returns true when source directory does not exist (error fallback)', () => {
      expect(isSourceNewer('/nonexistent/src', path.join(tmpDir, 'whatever.js'))).toBe(true);
    });

    it('ignores non-.ts files in source directory', () => {
      const srcDir = path.join(tmpDir, 'src');
      fs.mkdirSync(srcDir);
      fs.writeFileSync(path.join(srcDir, 'readme.md'), 'just docs');

      const distFile = path.join(tmpDir, 'index.js');
      const future = new Date(Date.now() + 10000);
      fs.writeFileSync(distFile, 'compiled');
      fs.utimesSync(distFile, future, future);

      expect(isSourceNewer(srcDir, distFile)).toBe(false);
    });

    it('checks nested subdirectories', async () => {
      const srcDir = path.join(tmpDir, 'src');
      const nestedDir = path.join(srcDir, 'routes');
      fs.mkdirSync(nestedDir, { recursive: true });

      const distFile = path.join(tmpDir, 'index.js');
      fs.writeFileSync(distFile, 'old');

      await new Promise((r) => setTimeout(r, 50));
      fs.writeFileSync(path.join(nestedDir, 'api.ts'), 'new route');

      expect(isSourceNewer(srcDir, distFile)).toBe(true);
    });
  });
});
