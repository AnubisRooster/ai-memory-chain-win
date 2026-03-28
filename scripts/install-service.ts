import os from 'os';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { detectPlatform, getProjectDir } from './lib/platform';
import { ensureDir } from './lib/config';

const projectDir = getProjectDir();
const platform = detectPlatform();

function installWindowsTaskScheduler() {
  const taskName = 'AIMemoryChain';
  const startupScript = path.join(projectDir, 'scripts', 'startup.ps1');
  const logDir = path.join(projectDir, 'logs');
  ensureDir(logDir);

  console.log('Installing AI Memory Chain as a Windows Scheduled Task...');
  console.log('');

  // Create a wrapper batch file that Task Scheduler calls
  const wrapperBat = path.join(projectDir, 'scripts', 'task-scheduler-wrapper.bat');
  const batContent = [
    '@echo off',
    `cd /d "${projectDir}"`,
    `powershell -ExecutionPolicy Bypass -File "${startupScript}" >> "${path.join(logDir, 'task-scheduler.log')}" 2>&1`,
  ].join('\r\n');
  fs.writeFileSync(wrapperBat, batContent, 'utf-8');

  // Remove existing task if present
  try {
    execSync(`schtasks /delete /tn "${taskName}" /f`, { stdio: ['pipe', 'pipe', 'pipe'] });
  } catch {
    // Task might not exist yet
  }

  // Create the scheduled task
  try {
    execSync(
      `schtasks /create /tn "${taskName}" /tr "${wrapperBat}" /sc ONLOGON /rl HIGHEST /f`,
      { stdio: 'inherit' },
    );
  } catch (err) {
    console.error('Failed to create scheduled task. Try running as Administrator.');
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  console.log('');
  console.log('AI Memory Chain installed as a Windows login task.');
  console.log('');
  console.log(`  Task Name: ${taskName}`);
  console.log(`  Wrapper:   ${wrapperBat}`);
  console.log(`  Logs:      ${logDir}\\`);
  console.log('');
  console.log('  It will start automatically when you log in.');
  console.log('  Docker Desktop must also be set to start at login:');
  console.log('    Docker Desktop > Settings > General > "Start Docker Desktop when you sign in"');
  console.log('');
  console.log('  Manual commands:');
  console.log(`    Start now:    schtasks /run /tn "${taskName}"`);
  console.log(`    Stop:         ts-node scripts/shutdown.ts`);
  console.log(`    View logs:    Get-Content -Wait ${path.join(logDir, 'startup.log')}`);
  console.log(`    Uninstall:    schtasks /delete /tn "${taskName}" /f`);
  console.log('');
}

function installMacOSLaunchAgent() {
  const plistDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
  const plistPath = path.join(plistDir, 'com.ai-memory-chain.plist');
  const logDir = path.join(projectDir, 'logs');
  ensureDir(logDir);
  ensureDir(plistDir);

  console.log('Installing AI Memory Chain as a macOS LaunchAgent...');
  console.log('');

  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ai-memory-chain</string>
    <key>ProgramArguments</key>
    <array>
        <string>${path.join(projectDir, 'node_modules', '.bin', 'ts-node')}</string>
        <string>${path.join(projectDir, 'scripts', 'startup.ts')}</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${projectDir}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>
    <key>ThrottleInterval</key>
    <integer>30</integer>
    <key>StandardOutPath</key>
    <string>${path.join(logDir, 'launchd-stdout.log')}</string>
    <key>StandardErrorPath</key>
    <string>${path.join(logDir, 'launchd-stderr.log')}</string>
</dict>
</plist>`;

  fs.writeFileSync(plistPath, plistContent, 'utf-8');

  try {
    const uid = execSync('id -u', { encoding: 'utf-8' }).trim();
    execSync(`launchctl bootout gui/${uid}/com.ai-memory-chain 2>/dev/null; true`, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    execSync(`launchctl bootstrap gui/${uid} "${plistPath}"`, { stdio: 'inherit' });
  } catch {
    try {
      execSync(`launchctl unload "${plistPath}" 2>/dev/null; true`, { stdio: ['pipe', 'pipe', 'pipe'] });
      execSync(`launchctl load "${plistPath}"`, { stdio: 'inherit' });
    } catch (err) {
      console.error('Failed to load LaunchAgent.');
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  }

  console.log('');
  console.log('AI Memory Chain installed as a login service.');
  console.log('');
  console.log(`  Plist:   ${plistPath}`);
  console.log(`  Logs:    ${logDir}/`);
  console.log('');
  console.log('  It will start automatically when you log in.');
  console.log('  Docker Desktop must also be set to start at login.');
  console.log('');
}

function installLinuxSystemd() {
  const serviceDir = path.join(os.homedir(), '.config', 'systemd', 'user');
  const servicePath = path.join(serviceDir, 'ai-memory-chain.service');
  const logDir = path.join(projectDir, 'logs');
  ensureDir(logDir);
  ensureDir(serviceDir);

  console.log('Installing AI Memory Chain as a systemd user service...');
  console.log('');

  const serviceContent = `[Unit]
Description=AI Memory Chain
After=docker.service

[Service]
Type=simple
WorkingDirectory=${projectDir}
ExecStart=${path.join(projectDir, 'node_modules', '.bin', 'ts-node')} ${path.join(projectDir, 'scripts', 'startup.ts')}
ExecStop=${path.join(projectDir, 'node_modules', '.bin', 'ts-node')} ${path.join(projectDir, 'scripts', 'shutdown.ts')}
Restart=on-failure
RestartSec=30

[Install]
WantedBy=default.target
`;

  fs.writeFileSync(servicePath, serviceContent, 'utf-8');

  try {
    execSync('systemctl --user daemon-reload', { stdio: 'inherit' });
    execSync('systemctl --user enable ai-memory-chain', { stdio: 'inherit' });
  } catch (err) {
    console.error('Failed to enable systemd service.');
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  console.log('');
  console.log('AI Memory Chain installed as a systemd user service.');
  console.log('');
  console.log(`  Service file: ${servicePath}`);
  console.log(`  Logs:         ${logDir}/`);
  console.log('');
  console.log('  Manual commands:');
  console.log('    Start:       systemctl --user start ai-memory-chain');
  console.log('    Stop:        systemctl --user stop ai-memory-chain');
  console.log('    Status:      systemctl --user status ai-memory-chain');
  console.log('    View logs:   journalctl --user -u ai-memory-chain -f');
  console.log('    Uninstall:   systemctl --user disable ai-memory-chain');
  console.log('');
}

function main() {
  console.log(`Detected platform: ${platform}`);
  console.log(`Project directory: ${projectDir}`);
  console.log('');

  switch (platform) {
    case 'windows':
      installWindowsTaskScheduler();
      break;
    case 'macos':
      installMacOSLaunchAgent();
      break;
    case 'linux':
      installLinuxSystemd();
      break;
  }
}

main();
