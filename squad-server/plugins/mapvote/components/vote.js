export default class Vote {
  constructor(engines) {
    this.engines = engines;
  }

  startVote() {}

  destroy() {
    this.autoVote.destroy();
    this.nomination.destroy();
    this.voteEngine.destroy();
    this.broadcastingEngine.destroy();
  }
}
