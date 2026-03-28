import { execSync } from 'child_process';
import http from 'http';
import { getDockerPath, sleep } from './platform';

export async function waitForDocker(maxAttempts = 60, intervalMs = 2000): Promise<boolean> {
  const docker = getDockerPath();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      execSync(`"${docker}" info`, {
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf-8',
      });
      return true;
    } catch {
      if (attempt % 10 === 0) {
        console.log(`Waiting for Docker... (${attempt}/${maxAttempts})`);
      }
      await sleep(intervalMs);
    }
  }

  return false;
}

export function dockerComposeUp(projectDir: string, logFile?: string): void {
  const docker = getDockerPath();
  const cmd = `"${docker}" compose up -d`;

  try {
    const output = execSync(cmd, {
      cwd: projectDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (logFile) {
      const fs = require('fs');
      fs.appendFileSync(logFile, output);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Docker compose up failed: ${msg}`);
  }
}

export async function waitForUrl(
  url: string,
  label: string,
  maxAttempts = 30,
  method: 'GET' | 'POST' = 'GET',
  intervalMs = 2000,
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const ok = await httpCheck(url, method);
      if (ok) return true;
    } catch {
      // retry
    }
    await sleep(intervalMs);
  }

  console.warn(`WARNING: ${label} not responding after ${maxAttempts * intervalMs / 1000}s.`);
  return false;
}

function httpCheck(urlStr: string, method: string): Promise<boolean> {
  return new Promise((resolve) => {
    const url = new URL(urlStr);
    const req = http.request(
      url,
      { method, timeout: 5000 },
      (res) => {
        res.resume();
        resolve(res.statusCode !== undefined && res.statusCode < 500);
      },
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

export function isDockerInstalled(): boolean {
  try {
    const docker = getDockerPath();
    execSync(`"${docker}" --version`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8',
    });
    return true;
  } catch {
    return false;
  }
}
