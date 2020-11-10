import Logger from 'core/logger';
import SquadServer from 'squad-server';
import printLogo from 'squad-server/logo';
import { ServerConfigBuilder } from './serverconfig.js';

async function main() {
  await printLogo();

  const envConfig = process.env.config;
  const configPath = process.argv[2];
  if (envConfig && configPath) throw new Error('Cannot accept both a config and config path.');

  const configProvider = new ServerConfigBuilder().build(envConfig, configPath);

  try {
    const server = new SquadServer(configProvider);

    await server.watch();
  } catch (e) {
    // Catch all uncatch errors, try not to rely on this.
    Logger.error('Main', e, e.stack);
  }
}

main();
