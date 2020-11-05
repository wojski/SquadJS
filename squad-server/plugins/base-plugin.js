export default class BasePlugin {
  static get description() {
    throw new Error('Plugin missing "static get description()" method.');
  }

  static get defaultEnabled() {
    throw new Error('Plugin missing "static get defaultEnabled()" method.');
  }

  static get optionsSpecification() {
    throw new Error('Plugin missing "static get optionsSpecification()" method.');
  }

  constructor(server, options = {}, optionsRaw = {}) {
    this.server = server;
    this.options = options;
    this.optionsRaw = optionsRaw;
  }
}
