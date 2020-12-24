import EventEmitter from 'events';
import { GetTimeText } from 'mapvote/helpers';
import { TRIGGER_START_VOTE, START_NEW_MAP, PLUGIN_STATE_SWITCH } from 'mapvote/constants';
import Logger from 'core/logger';

export default class NominateEngine extends EventEmitter {
  constructor(options, database, mapBasket, synchro) {
    super();

    this.database = database;
    this.nominations = [];
    this.nominationTime = null;

    this.isVoteStarted = false;
    this.nominationTriggerEmitted = false;

    this.synchro = synchro;
    this.options = new NominateOptions(options);
    this.mapBasketEngine = mapBasket;

    this.newMap();

    this.synchro.on(TRIGGER_START_VOTE, this.getNominationsForVote);
    this.synchro.on(START_NEW_MAP, this.newMap);
    this.synchro.on(PLUGIN_STATE_SWITCH, this.onPluginStateSwitch);
  }

  onPluginStateSwitch = (state) => {
    if (!state) {
      this.nominations = []; // Cleanup nominations
    }
  }

  newMap = () => {
    this.nominations = [];

    this.nominationTime = new Date(new Date().getTime() + this.options.nominationDelayTime * 1000);
    this.isVoteStarted = false;
    this.nominationTriggerEmitted = false;
  }

  isNominationAvailable = (identifier) => {
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

  addNewNomination = async (userText, identifier) => {
    try {
      var layerResult = await this.mapBasketEngine.isLayerAvailableByAutoComplete(userText);

      if (layerResult === null || !layerResult.isAvailable) {
        return { message: layerResult.message };
      }

      var layer = layerResult.layer;

      // Validation about renominate is done earlier
      var nominated = this.nominations.filter((x) => x.identifier === identifier);

      if (nominated.length > 0 && this.options.canReNominate) {
        nominated[0].layer = layer;
        this.database.addNomination({
          layer: layer.layer,
          steamId: identifier,
          isAdded: true,
          isRenomination: true
        });
      } else {
        this.nominations.push(new Nomination(layer, identifier));
        this.database.addNomination({
          layer: layer.layer,
          steamId: identifier,
          isAdded: true,
          isRenomination: false
        });
      }

      console.log(this.options.isNominationTriggerVote);
      console.log(this.nominationTriggerEmitted);

      if (this.options.isNominationTriggerVote && !this.nominationTriggerEmitted) {
        this.nominationTriggerEmitted = true;
        this.synchro.startNominate(this.options.voteDelayAfterFirstNominate);
      }
      var msg = `Nominated ${layer.layer}`;
      return { message: msg };
    } catch (error) {
      this.database.addNomination({
        layer: userText,
        steamId: identifier,
        isAdded: false,
        isRenomination: false
      });
      return { message: 'Invalid layer name' };
    }
  }

  getNominatedMapsInfo = async () => {
    var list = [];

    for (const nom of this.nominations) {
      if (!list.some((x) => x === nom.layer.layer)) {
        list.push(nom.layer.layer);
      }
    }

    return list;
  }

  getNominationsForVote = async () => {
    var nominations = [];

    for (const nom of this.nominations) {
      var item = nominations.filter((itm) => itm.layer.layer === nom.layer.layer);

      if (item != null && item.length > 0) {
        item.count += 1;
        if (item.players && item.players.length > 0) {
          item.players.push(nom.identifier);
        }
      } else {
        nominations.push({ layer: nom.layer, count: 1, players: [nom.identifier] });
      }
    }

    this.isVoteStarted = true;

    Logger.verbose(
      'MAPVOTE_COMMANDS',
      2,
      `${new Date()
        .toISOString()
        .replace(/T/, ' ')
        .replace(/\..+/, '')} NOMINATIONS - ${JSON.stringify(nominations)}`
    );

    this.synchro.nominationFetched(nominations);
  }

  destroy = () => {
    this.synchro.removeListener(TRIGGER_START_VOTE, this.getNominationsForVote);
    this.synchro.removeListener(START_NEW_MAP, this.newMap);
    this.synchro.removeListener(PLUGIN_STATE_SWITCH, this.onPluginStateSwitch);
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
