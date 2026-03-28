import { execSync, spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { isWindows, sleep } from './platform';

export interface ProcessInfo {
  pid: number;
  command?: string;
}

export function findProcessOnPort(port: number): ProcessInfo | null {
  try {
    if (isWindows()) {
      const output = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const lines = output.trim().split(/\r?\n/).filter(Boolean);
      if (lines.length === 0) return null;

      const parts = lines[0].trim().split(/\s+/);
      const pid = parseInt(parts[parts.length - 1], 10);
      if (isNaN(pid) || pid === 0) return null;
      return { pid };
    } else {
      const output = execSync(`lsof -ti:${port}`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const pid = parseInt(output.trim().split(/\n/)[0], 10);
      if (isNaN(pid)) return null;
      return { pid };
    }
  } catch {
    return null;
  }
}

export function killProcess(pid: number, force = false): boolean {
  try {
    if (isWindows()) {
      const flag = force ? '/F' : '';
      execSync(`taskkill ${flag} /PID ${pid}`.trim(), {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } else {
      const signal = force ? '-9' : '-15';
      execSync(`kill ${signal} ${pid}`, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    }
    return true;
  } catch {
    return false;
  }
}

export function isProcessAlive(pid: number): boolean {
  try {
    if (isWindows()) {
      const output = execSync(`tasklist /FI "PID eq ${pid}" /NH`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return output.includes(String(pid));
    } else {
      process.kill(pid, 0);
      return true;
    }
  } catch {
    return false;
  }
}

export async function killProcessOnPort(port: number): Promise<boolean> {
  const proc = findProcessOnPort(port);
  if (!proc) return false;

  killProcess(proc.pid);
  await sleep(1000);

  if (isProcessAlive(proc.pid)) {
    killProcess(proc.pid, true);
    await sleep(500);
  }

  return true;
}

export function spawnBackground(
  command: string,
  args: string[],
  options: {
    cwd?: string;
    logFile?: string;
    env?: Record<string, string>;
  },
): ChildProcess {
  const env = { ...process.env, ...options.env };

  const childOpts: Parameters<typeof spawn>[2] = {
    cwd: options.cwd,
    env,
    detached: !isWindows(),
    stdio: options.logFile ? ['ignore', 'pipe', 'pipe'] : 'ignore',
  };

  const child = spawn(command, args, childOpts);

  if (options.logFile) {
    const dir = path.dirname(options.logFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const logStream = fs.createWriteStream(options.logFile, { flags: 'a' });
    child.stdout?.pipe(logStream);
    child.stderr?.pipe(logStream);
  }

  if (!isWindows()) {
    child.unref();
  }

  return child;
}

export function writePidFile(pidDir: string, name: string, pid: number): void {
  if (!fs.existsSync(pidDir)) fs.mkdirSync(pidDir, { recursive: true });
  fs.writeFileSync(path.join(pidDir, `${name}.pid`), String(pid), 'utf-8');
}

export function readPidFile(pidDir: string, name: string): number | null {
  const pidFile = path.join(pidDir, `${name}.pid`);
  try {
    const content = fs.readFileSync(pidFile, 'utf-8').trim();
    const pid = parseInt(content, 10);
    return isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

export function removePidFile(pidDir: string, name: string): void {
  const pidFile = path.join(pidDir, `${name}.pid`);
  try {
    fs.unlinkSync(pidFile);
  } catch {
    // already gone
  }
}

export async function gracefulStop(pidDir: string, name: string): Promise<boolean> {
  const pid = readPidFile(pidDir, name);
  if (pid === null) return false;

  if (!isProcessAlive(pid)) {
    removePidFile(pidDir, name);
    return false;
  }

  killProcess(pid, false);
  await sleep(2000);

  if (isProcessAlive(pid)) {
    killProcess(pid, true);
    await sleep(500);
  }

  removePidFile(pidDir, name);
  return true;
}
