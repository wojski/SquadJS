import EventEmitter from 'events';
import { GetTimeText } from 'mapvote-extended/helpers';
import { TRIGGER_START_VOTE, START_NEW_MAP, PLUGIN_STATE_SWITCH } from 'mapvote-extended/constants';

export default class NominateEngine extends EventEmitter {
  constructor(options, mapBasket, synchro) {
    super();

    this.nominations = [];
    this.nominationTime = null;

    this.isVoteStarted = false;
    this.nominationTriggerEmitted = false;

    this.synchro = synchro;
    this.options = new NominateOptions(options);
    this.mapBasketEngine = mapBasket;

    this.newMap();

    this.synchro.on(TRIGGER_START_VOTE, async () => {
      await this.getNominationsForVote();
    });

    this.synchro.on(START_NEW_MAP, () => {
      this.newMap();
    });

    this.synchro.on(PLUGIN_STATE_SWITCH, (state) => {
      if (!state) {
        this.nominations = []; // Cleanup nominations
      }
    });
  }

  newMap() {
    this.nominations = [];

    this.nominationTime = new Date(new Date().getTime() + this.options.nominationDelayTime * 1000);
    this.isVoteStarted = false;
    this.nominationTriggerEmitted = false;
  }

  isNominationAvailable(identifier) {
    if (!this.options.isEnabled) {
      return { available: false, message: 'Nominate system is disabled' };
    }
    if (this.isVoteStarted) {
      return { available: false, message: 'Nomination is no longer possible' };
    }
    if (this.options.nominationDelayEnabled && new Date() < this.nominationTime) {
      return {
        available: false,
        message: `Nominations will be available in ${GetTimeText(this.nominationTime)}`
      };
    }
    if (!this.options.canReNominate && this.nominations.some((x) => x.identifier === identifier)) {
      return { available: false, message: 'You already nominate map' };
    }

    return { available: true };
  }

  async addNewNomination(userText, identifier) {
    try {
      var layerResult = await this.mapBasketEngine.isLayerAvailableByAutoComplete(userText);

      if (layerResult === null || !layerResult.isAvailable) {
        return { message: layerResult.message };
      }

      var layer = layerResult.layer;

      if (this.options.canReNominate) {
        var nominated = this.nominations.filter((x) => x.identifier === identifier);

        if (nominated.length > 0) {
          nominated[0].layer = layer;
        } else {
          this.nominations.push(new Nomination(layer, identifier));
        }
      } else {
        this.nominations.push(new Nomination(layer, identifier));
      }

      console.log(this.options.isNominationTriggerVote);
      console.log(this.nominationTriggerEmitted);

      if (this.options.isNominationTriggerVote && !this.nominationTriggerEmitted) {
        this.nominationTriggerEmitted = true;
        this.synchro.startNominate(this.options.voteDelayAfterFirstNominate);
      }

      return { message: `Nominated ${layer.layer}` };
    } catch (error) {
      return { message: 'Invalid layer name' };
    }
  }

  // TO remove
  // async getLayerByDidYouMean(layerName) {
  //     const layer = SquadLayers.getLayerByDidYouMean(layerName);
  //     if (layer === null) throw new Error(`${layerName} is not a Squad layer.`);
  //     return layer;
  // }

  async getNominatedMapsInfo() {
    var list = [];

    this.nominations.forEach((element) => {
      if (!list.some((x) => x === element.layer)) {
        list.push(element.layer);
      }
    });

    return list;
  }

  async getNominationsForVote() {
    var nominations = [];

    this.nominations.forEach((x) => {
      var item = nominations.filter((itm) => itm.layer === x.layer);

      if (item != null && item.length > 0) {
        item.count += 1;
        item.players.push(x.identifier);
      } else {
        nominations.push({ layer: x.layer, count: 1, players: [x.identifier] });
      }
    });

    this.isVoteStarted = true;

    this.synchro.nominationFetched(nominations);
  }
}

export class Nomination {
  constructor(layer, identifier) {
    this.layer = layer;
    this.identifier = identifier;
  }
}

export class NominateOptions {
  constructor(options) {
    if (options === null) {
      this.isEnabled = false;
    } else {
      this.isEnabled = options.isEnabled;
      this.canReNominate = options.canReNominate;
      this.triggersDefinition = options.triggers;
      this.nominationDelayEnabled = options.nominationDelayEnabled;
      this.nominationDelayTime = options.nominationDelayTime;
      this.isNominationTriggerVote = options.isNominationTriggerVote;
      this.voteDelayAfterFirstNominate = options.voteDelayAfterFirstNominate;
    }
  }
}
