import { SquadLayers } from 'core/squad-layers';
import { NOMINATION_FETCH } from 'mapvote-extended/constants';

export default class MapBasketEngine {
  constructor(server, options, layerFilter, synchro) {
    this.server = server;
    this.multipleLayersFromSameMap = options.multipleLayersFromSameMap;
    this.squadLayerFilter = layerFilter;
    this.synchro = synchro;

    this.synchro.on(NOMINATION_FETCH, async (nominations) => {
      await this.getMapsForVote(nominations);
    });
  }

  async isLayerAvailable(layerName) {
    const layerResult = SquadLayers.getLayerByDidYouMean(layerName);
    if (layerResult === null) {
      return { isAvailable: false, message: `${layerName} is not a Squad layer.` };
    }
    if (!this.squadLayerFilter.inLayerPool(layerResult)) {
      return { isAvailable: false, message: `${layerResult.layer} is not in layer pool.` };
    }
    if (!this.squadLayerFilter.isLayerHistoryCompliant(this.server, layerResult)) {
      return { isAvailable: false, message: `${layerResult.layer} was played too recently.` };
    }
    if (!this.squadLayerFilter.isMapHistoryCompliant(this.server, layerResult)) {
      return { isAvailable: false, message: `${layerResult.map} was played too recently.` };
    }
    if (!this.squadLayerFilter.isGamemodeHistoryCompliant(this.server, layerResult)) {
      return { isAvailable: false, message: `${layerResult.gamemode} was played too recently.` };
    }
    if (!this.squadLayerFilter.isGamemodeRepetitiveCompliant(this.server, layerResult)) {
      return {
        isAvailable: false,
        message: `${layerResult.gamemode} has been played too much recently.`
      };
    }
    if (!this.squadLayerFilter.isFactionCompliant(this.server, layerResult)) {
      return {
        isAvailable: false,
        message: 'Cannot be played as one team will remain the same faction.'
      };
    }
    if (!this.squadLayerFilter.isFactionHistoryCompliant(this.server, layerResult)) {
      return {
        isAvailable: false,
        message: `Cannot be played as either ${layerResult.teamOne.faction} or ${layerResult.teamTwo.faction} has been played too recently.`
      };
    }
    if (!this.squadLayerFilter.isFactionRepetitiveCompliant(this.server, layerResult)) {
      return {
        isAvailable: false,
        message: `Cannot be played as either ${layerResult.teamOne.faction} or ${layerResult.teamTwo.faction} has been played too much recently.`
      };
    }
    if (!this.squadLayerFilter.isPlayerCountCompliant(this.server, layerResult)) {
      return {
        isAvailable: false,
        message: `${layerResult.layer} is only suitable for a player count between ${layerResult.estimatedSuitablePlayerCount.min} and ${layerResult.estimatedSuitablePlayerCount.max}.`
      };
    }

    return { isAvailable: true, layer: layerResult.layer, map: layerResult.map };
  }

  async getMapsForVote(nominations) {
    var randomizedMaps = [];

    var layers = this.squadLayerFilter.getLayers();

    while (randomizedMaps.length < 4) {
      var layer = layers[Math.floor(Math.random() * layers.length)];

      if (
        !randomizedMaps.some((x) => x.layer === layer.layer) &&
        !randomizedMaps.some((x) => x.layer === layer.layer)
      ) {
        var result = await this.isLayerAvailable(layer.layer);

        if (
          result.isAvailable &&
          (this.multipleLayersFromSameMap || !randomizedMaps.some((x) => x.mapName === result.map))
        ) {
          randomizedMaps.push({ layer: result.layer, mapName: result.map });
        }
      }
    }

    var mapsToVote = [];

    var i = 0;

    do {
      if (nominations.length > i) {
        mapsToVote.push(nominations[i].layer);
      }

      if (randomizedMaps.length > i) {
        mapsToVote.push(randomizedMaps[i].layer);
      }

      i++;
    } while (mapsToVote.length < nominations.length + randomizedMaps.length);

    var results = [];

    while (results.length < 4) {
      var lr = mapsToVote[Math.floor(Math.random() * mapsToVote.length)];

      if (!results.some((x) => x.layer === lr)) {
        var fullLr = SquadLayers.getLayerByDidYouMean(lr);

        results.push({
          id: results.length + 1,
          layer: lr,
          teamsInfo: `${fullLr.teamOne.faction.substring(
            0,
            3
          )} - ${fullLr.teamTwo.faction.substring(0, 3)}`,
          votes: 0
        });
      }
    }

    console.log('4 random maps to vote');
    console.log(results);

    this.synchro.finalMapsFetched(results);
  }
}
