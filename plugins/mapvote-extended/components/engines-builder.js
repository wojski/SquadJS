/*
  engines: {
    autoVote: null,
    mapBasket: null,
    nomination: null,
    broadcasting: null
  },
*/

import AutoVoteEngine from './engines/auto-vote-engine.js';
import NominateEngine from './engines/nominate-engine.js';

export default class EnginesBuilder {
  constructor(server, options) {
    this.server = server;
    this.options = options;
  }

  Build() {
    const engines = {
      autoVote: new AutoVoteEngine(this.server, this.options.autoVoting),
      nomination: new NominateEngine(this.server, this.options.nomination)
    };

    return engines;

    // if (this.options.nomination != null && this.options.nomination.isEnabled) {

    // }

    // if (this.options.broadcasting != null && this.options.broadcasting.enableVoteStatusBroadcasting) {

    // }

    // if(options.nomination != null && options.nomination.isEnabled){
    //   // setupNomination
    // }

    // if(options.broadcasting != null && options.broadcasting.enableVoteStatusBroadcasting){

    // }
  }
}
