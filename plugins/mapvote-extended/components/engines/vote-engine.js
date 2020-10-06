// Ten engine ma za zadanie obsluzyc caly proces glosowania
// - Vote start
// - Vote end
// - Status
// - Set map
// - Vote in progress
// - Vote ended
import EventEmitter from 'events';
import { FINAL_MAP_FETCH } from 'mapvote-extended/constants';
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

    this.synchro.on(FINAL_MAP_FETCH, (maps) => {
      console.log('[VOTE ENGINE] START VOTE');
      this.startVote(maps);
    });
  }

  startVote(maps) {
    this.options = maps;
    this.voteInProgress = true;
    this.votes = [];
    this.voteEndTime = new Date(new Date().getTime() + this.voteTime * 60000);
    this.winningMap = null;

    setTimeout(() => this.endVote, this.voteTime * 60 * 1000);

    this.synchro.startVote();
  }

  endVote() {
    this.voteInProgress = false;

    var option = null;

    this.options.forEach((x) => {
      if (option.votes < x.votes) {
        option = x;
      }
    });

    this.synchro.endVote(option.layer);
  }

  getVotingMessage() {
    var message = 'Votemap started. Vote by type number in chat. ';

    var i = 1;

    this.options.forEach((x) => {
      message += ` ${x.id}. ${x.layer}`;
      if (i < 4) {
        message += ' |';
      }
    });

    message += ` Time left: ${GetTimeText(this.voteEndTime)}`;

    return message;
  }

  getVotingInfo() {
    var messages = [];

    this.options.forEach((x) => {
      messages.push(` ${x.id}. ${x.layer} | votes: ${x.votes}`);
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

      this.voters.push(identifier);

      var option = this.options.filter((x) => x.id === number);
      console.log(`Number: ${number}, Option: ${option}`);
      console.log(option);
      console.log(option[0]);

      option[0].votes += 1;

      await this.setWinningMap();

      return { confirmed: false, message: `You voted for ${option[0].layer}` };
    }
  }
}
