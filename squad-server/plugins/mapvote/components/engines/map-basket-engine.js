import {
  NOMINATION_FETCH,
  MAPVOTE_FILTERS_ALLOW_ONLY_LAYERS,
  MAPVOTE_FILTERS_BLOCK_MODE,
  MAPVOTE_FILTERS_DECREASE_MODE,
  MAPVOTE_FILTERS_DEDUPLICATE_MAP,
  MAPVOTE_FILTERS_DECREASE_DLC
} from 'mapvote/constants';

export default class MapBasketEngine {
  constructor(server, options, synchro) {
    this.server = server;
    this.mapBasketOptions = options.mapBasketOptions;
    this.layerPool = options.layerFilter;
    this.synchro = synchro;

    this.synchro.on(NOMINATION_FETCH, async (nominations) => {
      await this.getMapsForVote(nominations);
    });
  }

  isLayerAvailableByAutoComplete = async (layerName) => {
    const layer = this.layerPool.getLayerByLayerNameAutoCorrection(layerName);

    return await this.isLayerAvailable(layer.layer);
  }

  isLayerAvailable = async (layerName) => {
    const layer = this.layerPool.getLayerByLayerName(layerName);
    if (layer === null) {
      return { isAvailable: false, message: `${layerName} is not a Squad layer.` };
    }
    if (!this.layerPool.inPool(layer)) {
      return { isAvailable: false, message: `${layer.layer} is not in layer pool.` };
    }
    if (!this.layerPool.isHistoryCompliant(this.server.layerHistory, layer)) {
      return { isAvailable: false, message: `${layer.layer} was played too recently.` };
    }
    if (!this.layerPool.isMapHistoryCompliant(this.server.layerHistory, layer)) {
      return { isAvailable: false, message: `${layer.map} was played too recently.` };
    }
    if (!this.layerPool.isGamemodeHistoryCompliant(this.server.layerHistory, layer)) {
      return { isAvailable: false, message: `${layer.gamemode} was played too recently.` };
    }
    if (!this.layerPool.isGamemodeRepetitiveCompliant(this.server.layerHistory, layer)) {
      return {
        isAvailable: false,
        message: `${layer.gamemode} has been played too much recently.`
      };
    }
    if (!this.layerPool.isFactionCompliant(this.server.layerHistory, layer)) {
      return {
        isAvailable: false,
        message: 'Cannot be played as one team will remain the same faction.'
      };
    }
    if (!this.layerPool.isFactionHistoryCompliant(this.server.layerHistory, layer)) {
      return {
        isAvailable: false,
        message: `Cannot be played as either ${layer.teamOne.faction} or ${layer.teamTwo.faction} has been played too recently.`
      };
    }
    if (!this.layerPool.isDlcHistoryCompliant(this.server.layerHistory, layer)) {
      return {
        isAvailable: false,
        message: `Cannot be played dlc: ${layer.dlc} has been played too recently.`
      };
    }
    if (!this.layerPool.isFactionRepetitiveCompliant(this.server, layer)) {
      return {
        isAvailable: false,
        message: `Cannot be played as either ${layer.teamOne.faction} or ${layer.teamTwo.faction} has been played too much recently.`
      };
    }
    if (!this.layerPool.isPlayerCountCompliant(this.server, layer)) {
      return {
        isAvailable: false,
        message: `${layer.layer} is only suitable for a player count between ${layer.estimatedSuitablePlayerCount.min} and ${layer.estimatedSuitablePlayerCount.max}.`
      };
    }

    return await this.isLayerAvailableCustom(layer);
  }

  getMapsForVote = async (nominations) => {
    var layers = this.layerPool.layers;

    var mapsToVote = [];

    var nominatedMaps = nominations;
    this.shuffleArray(nominatedMaps)

    for (const nomResult of nominatedMaps) {
      if (mapsToVote.length >= 3) {
        break;
      }

      let lr = nomResult.layer;
      var basketValidatorResults = this.validateBasket(lr, mapsToVote);

      if (basketValidatorResults.isAvailable) {
        mapsToVote.push(lr);
      }
    }

    while (mapsToVote.length < 4) {
      var layer = layers[Math.floor(Math.random() * layers.length)];

      if (
        !mapsToVote.some((x) => x.layer === layer.layer) &&
        !mapsToVote.some((x) => x.layer === layer.layer)
      ) {
        var result = await this.isLayerAvailable(layer.layer);
        if (!result.isAvailable) {
          continue;
        }

        var basketValidatorResults = this.validateBasket(layer, mapsToVote);
        if (basketValidatorResults.isAvailable) {
          mapsToVote.push(result.layer);
        }
      }
    }

    this.shuffleArray(mapsToVote);

    var results = [];

    for (const item of mapsToVote) {
      results.push({
        id: results.length + 1,
        layer: item.layer,
        teamsInfo: `${item.teamOne.faction.substring(0, 3)} - ${item.teamTwo.faction.substring(
          0,
          3
        )}`,
        votes: 0
      });
    }

    this.synchro.finalMapsFetched(results);
  }

  shuffleArray = (array) => {
    for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
  }

  isLayerAvailableCustom = async (layer) => {
    if (this.mapBasketOptions == null || !this.mapBasketOptions.customFilters) {
      return { isAvailable: true, layer: layer };
    }

    var availabilityFilters = this.mapBasketOptions.customFilters.filter(
      (x) => x.type === MAPVOTE_FILTERS_ALLOW_ONLY_LAYERS || x.type === MAPVOTE_FILTERS_BLOCK_MODE
    );

    const seedPlugin = this.server.plugins.find((x) => x.constructor.name === 'SeedingMode');

    const isSeed = !!seedPlugin && !!seedPlugin.isSeed && seedPlugin.isSeed;

    for (const filter of availabilityFilters) {
      var result = null;

      if (filter.conditions.isSeed !== isSeed) {
        continue;
      }

      if (filter.type === MAPVOTE_FILTERS_ALLOW_ONLY_LAYERS) {
        result = this.allowOnlyLayersFilter(filter, layer);
      } else if (filter.type === MAPVOTE_FILTERS_BLOCK_MODE) {
        result = this.blockModeFilter(filter, layer);
      }

      if (!result.isAvailable) {
        return result;
      }
    }

    return { isAvailable: true, layer: layer };
  }

  allowOnlyLayersFilter = (filter, layer) => {
    if (!filter.layers || !filter.layers.length === 0) {
      return { isAvailable: true, layer: layer };
    } else {
      for (const map of filter.layers) {
        var layerName = this.layerPool.getLayerByLayerName(map);

        if (layerName.layer === layer.layer) {
          return { isAvailable: true, layer: layer };
        }
      }
    }

    return {
      isAvailable: false,
      message: filter.filterResponse.replace('{__LAYER__}', layer.layer)
    };
  }

  blockModeFilter = (filter, layer) => {
    if (!filter.gameModes || !filter.gameModes.length === 0) {
    } else {
      for (const mode of filter.gameModes) {
        if (mode.toLowerCase() === layer.gamemode.toLowerCase()) {
          return { isAvailable: false, message: filter.filterResponse };
        }
      }
    }

    return { isAvailable: true, layer: layer };
  }

  blockModeFilter = (filter, layer) => {
    if (!filter.gameModes || !filter.gameModes.length === 0) {
    } else {
      for (const mode of filter.gameModes) {
        if (mode.toLowerCase() === layer.gamemode.toLowerCase()) {
          return { isAvailable: false, message: filter.filterResponse };
        }
      }
    }

    return { isAvailable: true, layer: layer };
  }

  validateBasket = (layer, basket) => {
    var basketFilters = this.mapBasketOptions.customFilters.filter(
      (x) => x.type === MAPVOTE_FILTERS_DECREASE_MODE || x.type === MAPVOTE_FILTERS_DEDUPLICATE_MAP || x.type === MAPVOTE_FILTERS_DECREASE_DLC
    );

    const seedPlugin = this.server.plugins.find((x) => x.constructor.name === 'SeedingMode');

    const isSeed = !!seedPlugin && seedPlugin.isSeed;

    for (const filter of basketFilters) {
      var result = null;

      if (filter.conditions.isSeed !== isSeed) {
        continue;
      }

      if (filter.type === MAPVOTE_FILTERS_DECREASE_MODE) {
        result = this.decreaseMode(filter, layer, basket);
      } else if (filter.type === MAPVOTE_FILTERS_DEDUPLICATE_MAP) {
        result = this.deduplicateMap(filter, layer, basket);
      } else if (filter.type === MAPVOTE_FILTERS_DECREASE_DLC) {
        result = this.decreaseDLC(filter, layer, basket);
      }

      if (!result.isAvailable) {
        return result;
      }
    }

    return { isAvailable: true, layer: layer };
  }

  decreaseMode = (filter, layer, basket) => {
    if (!filter.gameModes || !filter.gameModes.length === 0) {
      return { isAvailable: true, layer: layer };
    } else {
      var layerGameMode = layer.gamemode;

      var filterForMode = filter.gameModes.find(
        (x) => x.toLowerCase() === layerGameMode.toLowerCase()
      );

      if (!filterForMode) {
        return { isAvailable: true, layer: layer };
      }

      var gameModeInBasket = 0;

      for (const layer of basket) {
        var isAnyFromFilter = filter.gameModes.some(
          (x) => x.toLowerCase() === layer.gamemode.toLowerCase()
        );

        if (isAnyFromFilter && ++gameModeInBasket >= filter.maxAmount) {
          break;
        }
      }

      return { isAvailable: gameModeInBasket < filter.maxAmount, layer: layer };
    }
  }

  decreaseDLC(filter, layer, basket) {
    if (!filter.dlc || !filter.dlc.length === 0) {
      return { isAvailable: true, layer: layer };
    } else {
      var layerDlc = layer.dlc;

      if (!layerDlc) {
        return { isAvailable: true, layer: layer };
      }

      var filterForDlc = filter.dlc.find((x) => x.toLowerCase() === layerDlc.toLowerCase());

      if (!filterForDlc) {
        return { isAvailable: true, layer: layer };
      }

      var dlcInBasket = 0;

      for (const layer of basket) {
        var isAnyFromFilter = filter.dlc.some((x) => layer.dlc && x.toLowerCase() === layer.dlc.toLowerCase());

        if (isAnyFromFilter && ++dlcInBasket >= filter.maxAmount) {
          break;
        }
      }

      return { isAvailable: dlcInBasket < filter.maxAmount, layer: layer };
    }
  }

  deduplicateMap = (filter, layer, basket) => {
    var map = layer.map;

    var mapsInBasket = basket.filter((x) => x.map.toLowerCase() === map.toLowerCase());

    return { isAvailable: mapsInBasket.length < filter.maxAmount, layer: layer };
  }
}
