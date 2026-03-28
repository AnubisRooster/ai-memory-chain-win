import { loadProjectConfig } from './lib/config';
import { gracefulStop, killProcessOnPort } from './lib/process-manager';
import { Logger } from './lib/logger';
import { sleep } from './lib/platform';

async function main() {
  const config = loadProjectConfig();
  const { logDir, backendPort, frontendPort } = config;
  const logger = new Logger(logDir);

  logger.log('=== AI Memory Chain shutdown ===');

  for (const svc of ['backend', 'frontend'] as const) {
    const stopped = await gracefulStop(logDir, svc);
    if (stopped) {
      logger.log(`Stopped ${svc} via PID file.`);
    }
  }

  await sleep(3000);

  for (const port of [backendPort, frontendPort]) {
    const killed = await killProcessOnPort(port);
    if (killed) {
      logger.log(`Force-killed leftover process on port ${port}`);
    }
  }

  logger.log('=== AI Memory Chain shutdown complete ===');
}

main().catch((err) => {
  console.error('Shutdown failed:', err.message || err);
  process.exit(1);
});
