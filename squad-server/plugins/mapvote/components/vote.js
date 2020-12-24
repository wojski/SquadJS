export default class Vote {
  constructor(engines) {
    this.engines = engines;
  }

  startVote = () => {
    this.engines.autoVote.startNewMap();
  }

  isVoteInProgress = () => {
    return this.engines.autoVote.voteInProgress;
  }

  isAutoVoteStarted = () => {
    return this.engines.autoVote.isAutoVoteStarted();
  }

  isPluginEnabled = () => {
    return this.engines.synchro.isPluginEnabled;
  }

  switchPlugin = () => {
    this.engines.synchro.switchPlugin();
  }

  isNominationAvailable = (identifier) => {
    return this.engines.nomination.isNominationAvailable(identifier);
  }

  getAutoVoteInfo = () => {
    return this.engines.autoVote.getAutoVoteInfo();
  }

  triggerManually = () => {
    this.engines.autoVote.triggerManually();
  }

  getResult = () => {
    return this.engines.voteEngine.getResult();
  }

  getEarliestTrigger = () => {
    return this.engines.autoVote.getEarliestTrigger();
  }

  getVotingInfo = async () => {
    return await this.engines.voteEngine.getVotingInfo();
  }

  getNominatedMapsInfo = async () => {
    return await this.engines.nomination.getNominatedMapsInfo();
  }

  makeVoteByNumber = async (number, identifier) => {
    return await this.engines.voteEngine.makeVoteByNumber(number, identifier);
  }

  addNewNomination = async (layer, identifier) => {
    return await this.engines.nomination.addNewNomination(
      layer,
      identifier
    );
  }

  destroy = () => {
    this.engines.autoVote.destroy();
    this.engines.nomination.destroy();
    this.engines.voteEngine.destroy();
    this.engines.broadcastEngine.destroy();
  }
}
