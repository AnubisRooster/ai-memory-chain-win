import fs from 'fs';
import path from 'path';
import { getFileSize } from './platform';
import { ensureDir } from './config';

export class Logger {
  private logDir: string;
  private logFile: string;

  constructor(logDir: string, logFileName = 'startup.log') {
    this.logDir = logDir;
    this.logFile = path.join(logDir, logFileName);
    ensureDir(logDir);
  }

  log(message: string): void {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const line = `[${timestamp}] ${message}\n`;
    try {
      fs.appendFileSync(this.logFile, line, 'utf-8');
    } catch {
      // If file write fails, still output to console
    }
    console.log(line.trimEnd());
  }

  rotateLog(filePath: string, maxBytes = 5 * 1024 * 1024): boolean {
    const size = getFileSize(filePath);
    if (size > maxBytes) {
      try {
        const prevPath = `${filePath}.prev`;
        if (fs.existsSync(prevPath)) fs.unlinkSync(prevPath);
        fs.renameSync(filePath, prevPath);
        this.log(`Rotated ${path.basename(filePath)} (exceeded ${Math.round(maxBytes / 1024)}K)`);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  rotateLogs(fileNames: string[]): void {
    for (const name of fileNames) {
      this.rotateLog(path.join(this.logDir, name));
    }
  }

  getLogDir(): string {
    return this.logDir;
  }

  getLogFile(): string {
    return this.logFile;
  }
}
