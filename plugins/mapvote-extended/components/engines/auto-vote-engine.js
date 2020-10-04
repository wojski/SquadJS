// Ten hypervisor ma na celu automatyczne triggerowanie vote
// - Po rozpoczęciu mapy ustawić startowy czas całej mapy
// - Po rozpoczęciu mapy na podstawie opcji ustawić kiedy ma zostać striggerowany vote
// - Nasłuchiwać na informacje z serwera (liczba ticketów i czas)
// - Ticketow sie nie da

// server.on(A2S_INFO_UPDATED, () => {
//     if (!options.disableStatus)
//       options.discordClient.user.setActivity(
//         `(${server.playerCount}/${server.publicSlots}) ${server.currentLayer}`,
//         { type: 'WATCHING' }
//       );
//   });
import EventEmitter from 'events';
import { A2S_INFO_UPDATED } from 'squad-server/events';
import { START_VOTE } from '../core/constants';

export const AUTO_VOTE_TRIGGER_TYPE = {
  TICKET: 1, // How to obtain current ticket values?
  TIME: 2,
  NOMINATE: 3
};

export default class AutoVoteEngine extends EventEmitter {
  constructor(server, options) {
    super();

    this.server = server;

    if (options === null) {
      this.isEnabled = false;
    } else {
      this.isEnabled = options.isEnabled;
      this.triggersDefinition = options.triggers;
    }

    this.triggers = [];

    server.on(A2S_INFO_UPDATED, () => {
      console.log('Auto vote debug');
      console.log(JSON.serialize(this.server));
    });

    this.setupTriggers();
  }

  startNewMap() {
    this.setupTriggers();
  }

  setupTriggers() {
    // If not enabled, no defined triggers will be set
    if (this.isEnabled) {
      this.triggersDefinition.forEach((trigger) => {
        if (trigger.type === AUTO_VOTE_TRIGGER_TYPE.TIME) {
          this.triggers.push(new AutoVoteTimeTrigger(trigger, this.server.matchTimeout)); // verify this?
        }
      });
    }
  }

  addNominateTrigger() {
    console.log('Add nominate trigger');
  }

  checkTriggers() {
    let anyTriggerMet = false;

    for (let i = 0; i < this.triggers.length; i++) {
      if (this.triggers[i].isTriggerReady()) {
        anyTriggerMet = true;
        break;
      }
    }

    if (anyTriggerMet) {
      this.triggers = [];

      this.emit(START_VOTE, true);
    }
  }

  getAutoVoteInfo() {
    const info = [`Active: ${this.isEnabled}`, `Triggers: ${this.triggers.length}`];

    this.triggers.forEach((trigger) => {
      info.push(
        `${trigger.name} | ${AutoVoteEngine.TriggerTypeTransaltor(trigger.type)} | ${
          trigger.triggerTime
        }`
      );
    });

    return info;
  }

  static TranslateTriggerType(type) {
    switch (type) {
      case AUTO_VOTE_TRIGGER_TYPE.TIME:
        return 'TIME';
      case AUTO_VOTE_TRIGGER_TYPE.TICKET:
        return 'TICKET';
      case AUTO_VOTE_TRIGGER_TYPE.NOMINATE:
        return 'NOMINATE';
    }
  }
}

export class AutoVoteTimeTrigger {
  constructor(template, serverBaseTimeout) {
    this.type = template.type;
    this.name = template.name;
    this.triggerTime = serverBaseTimeout - template.value; // TO check how it's working
  }

  getTriggerTime() {
    return this.triggerTime;
  }

  isTriggerReady(serverTimeout) {
    return serverTimeout < this.triggerTime;
  }
}
