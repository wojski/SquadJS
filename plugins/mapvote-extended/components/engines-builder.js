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
import MapBasketEngine from './engines/map-basket-engine.js';

export default class EnginesBuilder {
  constructor(server, options) {
    this.server = server;
    this.options = options;
  }

  Build() {
    var mapBasket = new MapBasketEngine(this.server, this.options, this.options.layerFilter);

    const engines = {
      autoVote: new AutoVoteEngine(this.server, this.options.autoVoting, mapBasket),
      nomination: new NominateEngine(this.server, this.options.nomination, mapBasket),
      mapBasket: mapBasket // TO REMOVE (TEST ONLY!)
    };

    return engines;
  }
}
