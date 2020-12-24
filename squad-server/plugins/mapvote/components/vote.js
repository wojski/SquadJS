export default class Vote {
  constructor(engines) {
    this.engines = engines;
  }

  startVote() {
    this.engines.autoVote.startNewMap();
  }

  destroy() {
    this.autoVote.destroy();
    this.nomination.destroy();
    this.voteEngine.destroy();
    this.broadcastingEngine.destroy();
  }
}
