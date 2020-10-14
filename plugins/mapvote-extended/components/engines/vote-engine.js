import EventEmitter from 'events';
import { FINAL_MAP_FETCH, START_NEW_MAP } from 'mapvote-extended/constants';
import { GetTimeText } from 'mapvote-extended/helpers';

export default class VoteEngine extends EventEmitter {
  constructor(server, options, synchro) {
    super();

    this.voteInProgress = false;
    this.voteTime = options.voteTime;
    this.server = server;
    this.synchro = synchro;

    this.voteEndTime = null;
    this.winningMap = null;

    this.options = [];
    this.voters = [];

    this.synchro.on(START_NEW_MAP, () => {
      this.cleanupVotes();
    });

    this.synchro.on(FINAL_MAP_FETCH, (maps) => {
      console.log('[VOTE ENGINE] START VOTE');
      this.startVote(maps);
    });
  }

  cleanupVotes() {
    this.voters = [];
    this.winningMap = null;
    this.options = [];
    this.voteInProgress = false;
  }

  startVote(maps) {
    this.options = maps;
    this.voteInProgress = true;
    this.voters = [];
    this.voteEndTime = new Date(new Date().getTime() + this.voteTime * 60000);
    this.winningMap = null;

    setTimeout(() => {
      this.endVote();
    }, this.voteTime * 60 * 1000);

    this.synchro.startVote();
  }

  endVote() {
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

    this.synchro.endVote(option.layer);
  }

  getStartVotingMessage() {
    var message = 'Type number in chat. \n';

    this.options.forEach((x) => {
      message += `${x.id}. ${x.layer} [${x.teamsInfo}]\n`;
    });

    message += `Time: ${GetTimeText(this.voteEndTime)}`;

    return message;
  }

  getVotingMessage() {
    var message = '\n';

    this.options.forEach((x) => {
      message += `${x.id}. ${x.layer} [${x.teamsInfo}][${x.votes}]\n`;
    });

    message += `${GetTimeText(this.voteEndTime)} left`;

    return message;
  }

  getVotingInfo() {
    var messages = [];

    this.options.forEach((x) => {
      messages.push(` ${x.id}. ${x.layer} | (${x.teamsInfo}) | ${x.votes} - votes`);
    });

    messages.push(`Voters: ${this.voters.length}`);

    return messages;
  }

  getResult() {
    return this.winningMap;
  }

  async setWinningMap() {
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

  async makeVoteByNumber(number, identifier) {
    if (!this.voteInProgress) {
      return { confirmed: false, message: 'Vote ended' };
    } else {
      if (this.voters.some((x) => x === identifier)) {
        return { confirmed: false, message: 'Already voted' };
      }

      var filteredOptions = this.options.filter((x) => x.id === number);
      if (filteredOptions.length > 0) {
        filteredOptions[0].votes += 1;
        this.voters.push(identifier);

        await this.setWinningMap();

        console.log(filteredOptions);

        return { confirmed: true, message: `You voted for ${filteredOptions[0].layer}` };
      }
    }
  }
}
