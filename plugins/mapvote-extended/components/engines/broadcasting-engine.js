import EventEmitter from 'events';
import {
  START_NEW_MAP,
  END_VOTE,
  START_VOTE,
  NOMINATION_TRIGGER_CREATED
} from 'mapvote-extended/constants';

export default class BroadcastEngine extends EventEmitter {
  constructor(server, options, synchro, autoVoteEngine, voteEngine) {
    super();

    this.server = server;
    this.autoVoteEngine = autoVoteEngine;
    this.voteEngine = voteEngine;
    this.options = new BroadcastOptions(options);
    this.synchro = synchro;
    this.startMessage = null;

    this.synchro.on(START_NEW_MAP, () => {
      this.mapStartBroadcast();
    });

    this.synchro.on(END_VOTE, (layer) => {
      this.voteEndBroadcast(layer);
    });

    this.synchro.on(START_VOTE, () => {
      this.voteStartBroadcast();
    });

    this.synchro.on(NOMINATION_TRIGGER_CREATED, () => {
      this.nominationStartBroadcast();
    });
  }

  mapStartBroadcast() {
    if (this.options.enablefirstInformationBroadcasting) {
      if (this.startMessage != null) {
        clearTimeout(this.startMessage);
      }
      this.startMessage = setTimeout(() => {
        this.votemapInfo();
      }, this.options.firstInformationBroadcastingDelay * 60 * 1000);
    }
  }

  nominationStartBroadcast() {
    if (this.options.enableNominationBroadcasting) {
      this.votemapInfo();
    }
  }

  votemapInfo() {
    if (!this.voteEngine.voteInProgress && this.synchro.isPluginEnabled) {
      var triggerTime = this.autoVoteEngine.getEarliestTrigger();
      if (triggerTime != null) {
        this.server.rcon.execute(
          `AdminBroadcast [MAPVOTE] Votemap will start in ${triggerTime}.
Nominate with "!nominate <layer name>".
You can find more information about votemap by use "!mapvote help".`
        );
      }
    }
  }

  voteStartBroadcast() {
    if (!this.synchro.isPluginEnabled) {
      return;
    }

    this.server.rcon.execute(`AdminBroadcast [MAPVOTE] ${this.voteEngine.getVotingMessage()}`);

    if (this.options.enableVoteStatusBroadcasting) {
      var interval = setInterval(() => {
        if (!this.voteEngine.voteInProgress) {
          clearInterval(interval);
        } else {
          this.server.rcon.execute(
            `AdminBroadcast [MAPVOTE] ${this.voteEngine.getVotingMessage()}`
          );
        }
      }, this.options.voteStatusBroadcastingDelay * 1000);
    }
  }

  voteEndBroadcast(layer) {
    if (!this.synchro.isPluginEnabled) {
      return;
    }

    this.server.rcon.execute(
      `AdminBroadcast [MAPVOTE] Votemap ended, the next map will be \n ${layer}.`
    );
  }
}

export class BroadcastOptions {
  constructor(options) {
    this.enableVoteStatusBroadcasting = options.enableVoteStatusBroadcasting;
    this.voteStatusBroadcastingDelay = options.voteStatusBroadcastingDelay;
    this.enablefirstInformationBroadcasting = options.enablefirstInformationBroadcasting;
    this.firstInformationBroadcastingDelay = options.firstInformationBroadcastingDelay;
    this.enableNominationBroadcasting = options.enableNominationBroadcasting;
  }
}
