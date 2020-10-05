// Ten hypervisor ma na celu automatyczne triggerowanie vote
// - Po rozpoczęciu mapy na podstawie opcji ustawić kiedy ma zostać striggerowany vote
// - Ticketow sie nie da

import EventEmitter from 'events';
import { A2S_INFO_UPDATED } from 'squad-server/events';
import { START_VOTE } from 'mapvote-extended/constants';
import { GetTimeText } from 'mapvote-extended/helpers';

export const AUTO_VOTE_TRIGGER_TYPE = {
  TICKET: 1, // How to obtain current ticket values?
  TIME: 2,
  NOMINATE: 3
};

export default class AutoVoteEngine extends EventEmitter {
  constructor(server, options) {
    super();

    this.triggersCreated = false;
    this.nominateTriggerCreated = false;

    this.server = server;

    if (options === null) {
      this.isEnabled = false;
    } else {
      this.isEnabled = options.isEnabled;
      this.triggersDefinition = options.triggers;
    }

    this.triggers = [];

    // Not used, to verify can we obtain information about tickets left
    server.on(A2S_INFO_UPDATED, () => {
      //   console.log('Auto vote debug');
      //   console.log(this.server.matchTimeout);
    });

    this.startNewMap();
  }

  startNewMap() {
    this.triggers = [];
    this.triggersCreated = false;
    this.nominateTriggerCreated = false;
    this.setupTriggers();

    console.log('Start interval');
    // Check triggers every 30 seconds

    // setInterval(() => {

    //   }, (30 * 60 * 1000));

    setInterval(async () => {
      console.log('BAZUR');
      this.checkTriggers();
    }, 30 * 1000);
  }

  setupTriggers() {
    if (this.isEnabled) {
      if (this.triggersCreated) {
        return;
      }

      this.triggersCreated = true;

      this.triggersDefinition.forEach((trigger) => {
        if (trigger.type === AUTO_VOTE_TRIGGER_TYPE.TIME) {
          this.triggers.push(new AutoVoteTimeTrigger(trigger)); // verify this?
        }
      });
    }
  }

  addNominateTrigger(voteTimeDelay) {
    if (!this.nominateTriggerCreated) {
      this.nominateTriggerCreated = true;

      this.triggers.push(
        new AutoVoteTimeTrigger({
          type: AUTO_VOTE_TRIGGER_TYPE.NOMINATE,
          name: 'nominateTrigger',
          value: voteTimeDelay
        })
      );
    }
  }

  checkTriggers() {
    if (this.triggers.length === 0) {
      return;
    }

    console.log('Trigger check');

    let anyTriggerMet = false;

    for (let i = 0; i < this.triggers.length; i++) {
      console.log(`Trigger: ${this.triggers[i].name}`);

      if (this.triggers[i].isReadyToTrigger()) {
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
        `${trigger.name} | ${this.translateTriggerType(trigger.type)} | In: ${GetTimeText(
          trigger.triggerTime
        )}`
      );
    });

    return info;
  }

  translateTriggerType(type) {
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
  constructor(template) {
    this.type = template.type;
    this.name = template.name;
    this.triggerTime = new Date(new Date().getTime() + template.value * 60000); // TO check how it's working
  }

  getTriggerTime() {
    return this.triggerTime;
  }

  isReadyToTrigger() {
    return new Date() > this.triggerTime;
  }
}
