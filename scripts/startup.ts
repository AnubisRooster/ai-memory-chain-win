import path from 'path';
import { execSync } from 'child_process';
import {
  getProjectDir,
  sleep,
  getNodePath,
  getNpxPath,
  isWindows,
} from './lib/platform';
import {
  killProcessOnPort,
  spawnBackground,
  writePidFile,
  isProcessAlive,
} from './lib/process-manager';
import {
  loadProjectConfig,
  ensureDir,
  isSourceNewer,
} from './lib/config';
import { waitForDocker, dockerComposeUp, waitForUrl } from './lib/docker';
import { Logger } from './lib/logger';

async function main() {
  const config = loadProjectConfig();
  const { projectDir, logDir } = config;
  ensureDir(logDir);

  const logger = new Logger(logDir);

  const onShutdown = () => {
    logger.log('Caught signal — shutting down children...');
    const { gracefulStop } = require('./lib/process-manager');
    Promise.all([
      gracefulStop(logDir, 'backend'),
      gracefulStop(logDir, 'frontend'),
    ]).finally(() => {
      logger.log('Children stopped.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', onShutdown);
  process.on('SIGINT', onShutdown);
  if (!isWindows()) {
    process.on('SIGHUP', onShutdown);
  }

  logger.log('=== AI Memory Chain startup begin ===');

  logger.rotateLogs(['backend.log', 'frontend.log', 'docker.log', 'startup.log']);

  // ── Docker ──────────────────────────────────────────────────────
  logger.log('Waiting for Docker daemon...');
  const dockerReady = await waitForDocker(60, 2000);
  if (!dockerReady) {
    logger.log('ERROR: Docker not ready after 2 min.');
    process.exit(1);
  }
  logger.log('Docker daemon is ready.');

  const dockerLog = path.join(logDir, 'docker.log');
  try {
    dockerComposeUp(projectDir, dockerLog);
    logger.log('Docker containers started.');
  } catch (err) {
    logger.log(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  // ── Infrastructure health gates ─────────────────────────────────
  await waitForUrl('http://localhost:8545', 'Polygon Edge', 30);
  logger.log('Polygon Edge is ready.');

  await waitForUrl('http://localhost:5001/api/v0/id', 'IPFS', 15, 'POST');
  logger.log('IPFS is ready.');

  // ── Kill stale processes on our ports ───────────────────────────
  for (const port of [config.backendPort, config.frontendPort]) {
    const killed = await killProcessOnPort(port);
    if (killed) {
      logger.log(`Killed stale process on port ${port}`);
    }
  }

  // ── Environment ─────────────────────────────────────────────────
  if (config.contractAddress) {
    process.env.CONTRACT_ADDRESS = config.contractAddress;
  } else {
    logger.log('WARNING: CONTRACT_ADDRESS is empty — deployment.json may be missing.');
  }

  if (config.deployerPrivateKey) {
    process.env.DEPLOYER_PRIVATE_KEY = config.deployerPrivateKey;
  }

  // ── Rebuild backend if source is newer than dist ────────────────
  const backendSrc = path.join(projectDir, 'backend', 'src');
  const backendDist = path.join(projectDir, 'backend', 'dist', 'index.js');

  if (isSourceNewer(backendSrc, backendDist)) {
    logger.log('Backend source newer than dist — rebuilding...');
    try {
      const npx = getNpxPath();
      execSync(`"${npx}" tsc`, {
        cwd: path.join(projectDir, 'backend'),
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      logger.log('Backend rebuild succeeded.');
    } catch {
      logger.log('ERROR: Backend rebuild failed — starting with stale dist.');
    }
  }

  // ── Rebuild frontend if .next/BUILD_ID is missing ───────────────
  const frontendBuildId = path.join(projectDir, 'frontend', '.next', 'BUILD_ID');
  const fs = require('fs');
  if (!fs.existsSync(frontendBuildId)) {
    logger.log('Frontend BUILD_ID missing — rebuilding...');
    try {
      const npx = getNpxPath();
      execSync(`"${npx}" next build`, {
        cwd: path.join(projectDir, 'frontend'),
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      logger.log('Frontend rebuild succeeded.');
    } catch {
      logger.log('ERROR: Frontend rebuild failed.');
      process.exit(1);
    }
  }

  // ── Start backend ───────────────────────────────────────────────
  const node = getNodePath();
  const backendChild = spawnBackground(
    node,
    [path.join('dist', 'index.js')],
    {
      cwd: path.join(projectDir, 'backend'),
      logFile: path.join(logDir, 'backend.log'),
      env: {
        CONTRACT_ADDRESS: config.contractAddress || '',
        DEPLOYER_PRIVATE_KEY: config.deployerPrivateKey || '',
        PORT: String(config.backendPort),
      },
    },
  );

  if (backendChild.pid) {
    writePidFile(logDir, 'backend', backendChild.pid);
    logger.log(`Backend started (PID ${backendChild.pid})`);
  }

  await sleep(2000);
  if (backendChild.pid && !isProcessAlive(backendChild.pid)) {
    logger.log('ERROR: Backend process exited immediately — check backend.log');
    process.exit(1);
  }

  await waitForUrl(`http://localhost:${config.backendPort}/health`, 'Backend', 10);
  logger.log('Backend health check passed.');

  // ── Start frontend ──────────────────────────────────────────────
  const npx = getNpxPath();
  const frontendChild = spawnBackground(
    npx,
    ['next', 'start', '--port', String(config.frontendPort), '--hostname', '0.0.0.0'],
    {
      cwd: path.join(projectDir, 'frontend'),
      logFile: path.join(logDir, 'frontend.log'),
    },
  );

  if (frontendChild.pid) {
    writePidFile(logDir, 'frontend', frontendChild.pid);
    logger.log(`Frontend started (PID ${frontendChild.pid})`);
  }

  await sleep(3000);
  if (frontendChild.pid && !isProcessAlive(frontendChild.pid)) {
    logger.log('ERROR: Frontend process exited immediately — check frontend.log');
    process.exit(1);
  }

  await waitForUrl(`http://localhost:${config.frontendPort}`, 'Frontend', 10);
  logger.log('Frontend health check passed.');

  logger.log('=== AI Memory Chain startup complete ===');
  logger.log(`  Backend:  http://localhost:${config.backendPort}  (PID ${backendChild.pid})`);
  logger.log(`  Frontend: http://localhost:${config.frontendPort}  (PID ${frontendChild.pid})`);

  // Keep parent alive so signal handlers work
  await new Promise(() => {});
}

main().catch((err) => {
  console.error('Startup failed:', err.message || err);
  process.exit(1);
});
