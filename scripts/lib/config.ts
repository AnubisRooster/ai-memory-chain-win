import fs from 'fs';
import path from 'path';
import { getProjectDir } from './platform';

export interface ProjectConfig {
  projectDir: string;
  logDir: string;
  dataDir: string;
  contractAddress: string | null;
  deployerPrivateKey: string | null;
  rpcUrl: string;
  backendPort: number;
  frontendPort: number;
}

export function loadContractAddress(projectDir: string): string | null {
  const envAddr = process.env.CONTRACT_ADDRESS;
  if (envAddr) return envAddr;

  const deployPath = path.join(projectDir, 'deployment.json');
  try {
    const raw = fs.readFileSync(deployPath, 'utf-8');
    const data = JSON.parse(raw);
    return data.address || null;
  } catch {
    return null;
  }
}

export function loadDeployerKey(projectDir: string): string | null {
  const envKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (envKey) return envKey;

  const keyPath = path.join(projectDir, 'data', 'polygon-edge', 'node1', 'consensus', 'validator.key');
  try {
    const raw = fs.readFileSync(keyPath, 'utf-8').trim();
    return raw.startsWith('0x') ? raw : `0x${raw}`;
  } catch {
    return null;
  }
}

export function loadProjectConfig(): ProjectConfig {
  const projectDir = getProjectDir();
  const logDir = path.join(projectDir, 'logs');
  const dataDir = path.join(projectDir, 'data');

  return {
    projectDir,
    logDir,
    dataDir,
    contractAddress: loadContractAddress(projectDir),
    deployerPrivateKey: loadDeployerKey(projectDir),
    rpcUrl: process.env.RPC_URL || 'http://127.0.0.1:8545',
    backendPort: parseInt(process.env.PORT || '3001', 10),
    frontendPort: parseInt(process.env.FRONTEND_PORT || '3000', 10),
  };
}

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function isSourceNewer(srcDir: string, distFile: string): boolean {
  if (!fs.existsSync(distFile)) return true;

  const distStat = fs.statSync(distFile);
  const distMtime = distStat.mtimeMs;

  function checkDir(dir: string): boolean {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (checkDir(fullPath)) return true;
      } else if (entry.name.endsWith('.ts')) {
        const srcStat = fs.statSync(fullPath);
        if (srcStat.mtimeMs > distMtime) return true;
      }
    }
    return false;
  }

  try {
    return checkDir(srcDir);
  } catch {
    return true;
  }
}
