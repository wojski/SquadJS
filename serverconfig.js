import fs from 'fs';

export class ServerConfigBuilder {
  build(envConfig, configPath) {
    return envConfig
      ? this.buildFromPlainString(envConfig)
      : this.buildFromConfigFile(configPath || './config.json');
  }

  buildFromConfigFile(file) {
    if (!fs.existsSync(file)) throw new Error(`Config file not found: "${file}"`);
    const configString = fs.readFileSync(file, 'utf8');
    return this.buildFromPlainString(configString);
  }

  buildFromPlainString(configString) {
    // eslint-disable-next-line no-useless-catch
    try {
      const configObject = JSON.parse(configString);
      return new ServerConfig(configObject);
    } catch (e) {
      // TODO: Log Stuff and help with parse errors related to JSON format
      throw e;
    }
  }
}

export class ServerConfig {
  constructor(configObject) {
    for (const option of ['host', 'queryPort'])
      if (!(option in configObject.server)) throw new Error(`${option} must be specified.`);

    if (!configObject.server.layerHistoryMaxLength) configObject.server.layerHistoryMaxLength = 20;
    configObject.plugins = this.checkPluginsConfig(configObject.plugins, configObject.connectors);
    this.config = configObject;

    // TODO: Verify json format with AJV for example
  }

  checkPluginsConfig(plugins) {
    if (!plugins || plugins.length <= 0) throw Error('No plugins specified in config file.');

    plugins = plugins.filter((plugin) => plugin.enabled);

    return plugins;
  }
}
