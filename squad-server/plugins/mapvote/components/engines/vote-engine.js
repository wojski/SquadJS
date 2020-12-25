import EventEmitter from 'events';
import { FINAL_MAP_FETCH } from 'mapvote/constants';
import { GetTimeText } from 'mapvote/helpers';
import Logger from 'core/logger';

export default class VoteEngine extends EventEmitter {
  constructor(server, options, database, synchro) {
    super();

    this.database = database;
    this.voteInProgress = false;
    this.voteTime = options.voteTime;
    this.server = server;
    this.synchro = synchro;

    this.voteEndTime = null;
    this.winningMap = null;

    this.options = [];
    this.voters = [];

    this.timeouts = [];

    this.synchro.on(FINAL_MAP_FETCH, this.onFinalMapFetch);
  }

  onFinalMapFetch = (maps) => {
    console.log('[VOTE ENGINE] START VOTE');
    this.startVote(maps);
  }

  startVote = (maps) => {
    this.options = maps;
    this.voteInProgress = true;
    this.voters = [];
    this.voteEndTime = new Date(new Date().getTime() + this.voteTime * 1000);
    this.winningMap = null;

    this.timeouts.push(
      setTimeout(() => {
        this.endVote();
      }, this.voteTime * 1000)
    );

    var optionsToStore = [];
    for (const option of maps) {
      optionsToStore.push({
        option: option.id,
        layer: option.layer,
        teams: option.teamsInfo
      });
    }

    this.database.startVote({ layers: JSON.stringify(optionsToStore) });

    this.synchro.startVote();
  }

  endVote = () => {
    console.log('[VOTE ENGINE] END VOTE');

    this.voteInProgress = false;

    var option = null;

    this.options.forEach((x) => {
      if (option === null) {
        option = x;
      }

      if (option.votes < x.votes) {
        option = x;
      }
    });

    Logger.verbose(
      'MAPVOTE_COMMANDS',
      2,
      `${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')} VOTE - ${JSON.stringify(
        this.options
      )}`
    );

    this.database.finaliseVote({ option: option.id, winner_layout: option.layer });

    this.synchro.endVote(option.layer);
  }

  getStartVotingMessage = () => {
    var message = 'Type number in chat. \n';

    this.options.forEach((x) => {
      message += `${x.id}. ${x.layer} [${x.teamsInfo}]\n`;
    });

    message += `Time: ${GetTimeText(this.voteEndTime)}`;

    return message;
  }

  getVotingMessage = () => {
    var message = '\n';

    this.options.forEach((x) => {
      message += `${x.id}. ${x.layer} [${x.teamsInfo}][${x.votes}]\n`;
    });

    message += `${GetTimeText(this.voteEndTime)} left`;

    return message;
  }

  getVotingInfo = () => {
    var messages = [];

    this.options.forEach((x) => {
      messages.push(` ${x.id}. ${x.layer} | (${x.teamsInfo}) | ${x.votes} - votes`);
    });

    messages.push(`Voters: ${this.voters.length}`);

    return messages;
  }

  getResult = () => {
    return this.winningMap;
  }

  setWinningMap= async() => {
    var option = null;

    this.options.forEach((x) => {
      if (option === null) {
        option = x;
      }

      if (option.votes < x.votes) {
        option = x;
      }
    });

    this.winningMap = option.layer;

    await this.server.rcon.execute(`AdminSetNextMap ${option.layer}`);
  }

  makeVoteByNumber = async(number, identifier)=> {
    if (!this.voteInProgress) {
      return { confirmed: false, message: 'Vote ended' };
    } else {
      if (this.voters.some((x) => x === identifier)) {
        return { confirmed: false, message: 'Already voted' };
      }

      var filteredOptions = this.options.filter((x) => x.id === number);
      if (filteredOptions.length > 0) {
        await this.database.addVote({ option: number, steamId: identifier });
        filteredOptions[0].votes += 1;
        this.voters.push(identifier);

        await this.setWinningMap();

        return { confirmed: true, message: `You voted for ${filteredOptions[0].layer}` };
      }
    }
  }

  destroy = () => {
    this.timeouts.forEach((x) => {
      clearTimeout(x);
    });

    this.synchro.removeListener(FINAL_MAP_FETCH, this.onFinalMapFetch);
  }
}
