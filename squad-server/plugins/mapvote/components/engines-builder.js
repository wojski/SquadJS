import AutoVoteEngine from './engines/auto-vote-engine.js';
import NominateEngine from './engines/nominate-engine.js';
import MapBasketEngine from './engines/map-basket-engine.js';
import BroadcastEngine from './engines/broadcasting-engine.js';
import VoteEngine from './engines/vote-engine.js';
import { EventSynchro } from './event-synchro.js';

export default class EnginesBuilder {
  constructor(server, options, database) {
    this.server = server;
    this.options = options;
    this.database = database;
  }

  // TODO kizia: Add database

  Build() {
    var synchro = new EventSynchro();

    var mapBasketEngine = new MapBasketEngine(this.server, this.options, synchro);
    var autoVoteEngine = new AutoVoteEngine(this.options.autoVoting, synchro);
    var nominateEngine = new NominateEngine(this.options.nomination, mapBasketEngine, synchro);
    var voteEngine = new VoteEngine(this.server, this.options, synchro);
    var broadcastingEngine = new BroadcastEngine(
      this.server,
      this.options.broadcast,
      synchro,
      autoVoteEngine,
      voteEngine
    );
    const engines = {
      synchro: synchro,
      autoVote: autoVoteEngine,
      nomination: nominateEngine,
      broadcastEngine: broadcastingEngine,
      voteEngine: voteEngine
    };

    return engines;
  }
}
