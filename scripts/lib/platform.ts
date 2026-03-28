import os from 'os';
import path from 'path';
import { execSync } from 'child_process';

export type Platform = 'windows' | 'macos' | 'linux';

export function detectPlatform(): Platform {
  switch (os.platform()) {
    case 'win32':
      return 'windows';
    case 'darwin':
      return 'macos';
    default:
      return 'linux';
  }
}

export function isWindows(): boolean {
  return os.platform() === 'win32';
}

export function isMacOS(): boolean {
  return os.platform() === 'darwin';
}

export function isLinux(): boolean {
  return os.platform() === 'linux';
}

export function findExecutable(name: string, fallbackPaths: string[] = []): string {
  if (isWindows()) {
    try {
      const result = execSync(`where ${name}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
      const firstLine = result.trim().split(/\r?\n/)[0];
      if (firstLine) return firstLine;
    } catch {
      // not found via where
    }
  } else {
    try {
      const result = execSync(`which ${name}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
      if (result.trim()) return result.trim();
    } catch {
      // not found via which
    }
  }

  for (const p of fallbackPaths) {
    try {
      const fs = require('fs');
      if (fs.existsSync(p)) return p;
    } catch {
      // skip
    }
  }

  return name;
}

export function getDockerPath(): string {
  const fallbacks = isWindows()
    ? [
        'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe',
        path.join(os.homedir(), 'AppData', 'Local', 'Docker', 'docker.exe'),
      ]
    : isMacOS()
      ? ['/usr/local/bin/docker', path.join(os.homedir(), '.docker', 'bin', 'docker')]
      : ['/usr/bin/docker', '/usr/local/bin/docker'];

  return findExecutable('docker', fallbacks);
}

export function getNodePath(): string {
  const fallbacks = isWindows()
    ? ['C:\\Program Files\\nodejs\\node.exe']
    : isMacOS()
      ? ['/opt/homebrew/bin/node', '/usr/local/bin/node']
      : ['/usr/bin/node', '/usr/local/bin/node'];

  return findExecutable('node', fallbacks);
}

export function getNpxPath(): string {
  const fallbacks = isWindows()
    ? ['C:\\Program Files\\nodejs\\npx.cmd']
    : isMacOS()
      ? ['/opt/homebrew/bin/npx', '/usr/local/bin/npx']
      : ['/usr/bin/npx', '/usr/local/bin/npx'];

  return findExecutable('npx', fallbacks);
}

export function getFileSize(filePath: string): number {
  const fs = require('fs');
  try {
    const stat = fs.statSync(filePath);
    return stat.size;
  } catch {
    return 0;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getProjectDir(): string {
  return path.resolve(__dirname, '..', '..');
}
