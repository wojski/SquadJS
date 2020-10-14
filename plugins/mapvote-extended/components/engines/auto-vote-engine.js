/*
  This engine duty is to trigger vote process.
  It can has multiple configured trigger and as soon as any meet condition process will start.
*/

import EventEmitter from 'events';
import { GetTimeText } from 'mapvote-extended/helpers';
import { NOMINATION_START, PLUGIN_STATE_SWITCH } from 'mapvote-extended/constants';

export const AUTO_VOTE_TRIGGER_TYPE = {
  TICKET: 1, // How to obtain current ticket values?
  TIME: 2,
  NOMINATE: 3
};

export default class AutoVoteEngine extends EventEmitter {
  constructor(options, synchro) {
    super();

    this.synchro = synchro;

    if (options === null) {
      this.isEnabled = false;
    } else {
      this.isEnabled = options.isEnabled;
      this.triggersDefinition = options.triggers;
    }

    this.triggers = [];

    this.synchro.on(NOMINATION_START, (delayTime) => {
      this.addTrigger(delayTime, AUTO_VOTE_TRIGGER_TYPE.NOMINATE);
    });

    this.synchro.on(PLUGIN_STATE_SWITCH, (state) => {
      if (!state) {
        this.triggers.forEach((x) => {
          x.disableTrigger();
        });
      }
    });
  }

  startNewMap() {
    if (!this.isEnabled) {
      return;
    }

    this.triggers = [];
    this.setupTriggers();

    this.synchro.startNewMap();

    console.log('[AUTO_VOTE_ENGINE] MAP STARTED');
  }

  triggerManually() {
    if (this.triggers.length > 0 && this.triggers.find((x) => x.active)) {
      this.triggerStartVote();
      return true;
    } else {
      return false;
    }
  }

  setupTriggers() {
    if (this.triggers.length > 0) {
      return;
    }

    this.triggersDefinition.forEach((trigger) => {
      if (trigger.type === AUTO_VOTE_TRIGGER_TYPE.TIME) {
        this.addTrigger(trigger.value, trigger.type);
      }
    });
  }

  addTrigger(voteTimeDelay, type) {
    if (
      type === AUTO_VOTE_TRIGGER_TYPE.NOMINATE &&
      this.triggers.find((x) => x.type === AUTO_VOTE_TRIGGER_TYPE.NOMINATE)
    ) {
      return;
    }

    var trigger = setTimeout(() => {
      this.triggerStartVote();
    }, voteTimeDelay * 1000);

    this.triggers.push(
      new AutoVoteTimeTrigger(
        {
          type: type,
          name: this.translateTriggerType(type),
          value: voteTimeDelay
        },
        trigger
      )
    );

    if (type === AUTO_VOTE_TRIGGER_TYPE.NOMINATE) {
      this.synchro.nominationTriggerCreated();
    }
  }

  triggerStartVote() {
    this.triggers.forEach((x) => {
      x.disableTrigger();
    });

    this.synchro.triggerStartVote();
  }

  getEarliestTrigger() {
    if (this.triggers.length === 0 || !this.triggers.find((x) => x.active)) {
      return null;
    }

    var closestTrigger = null;

    this.triggers.forEach((x) => {
      if (!x.active) {
        return;
      }

      if (closestTrigger === null) {
        closestTrigger = x;
      } else {
        if (closestTrigger.triggerTime > x.triggerTime) {
          closestTrigger = x;
        }
      }
    });

    return GetTimeText(closestTrigger.triggerTime);
  }

  getAutoVoteInfo() {
    const info = [`Active: ${this.isEnabled}`, `Triggers: ${this.triggers.length}`];

    this.triggers.forEach((trigger) => {
      info.push(
        `${trigger.name} | ${this.translateTriggerType(trigger.type)} | Active: ${
          trigger.active
        } | In: ${GetTimeText(trigger.triggerTime)}`
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

  isAutoVoteStarted() {
    return this.triggers.find((x) => x.active);
  }
}

export class AutoVoteTimeTrigger {
  constructor(template, trigger) {
    this.type = template.type;
    this.name = template.name;
    this.triggerTime = new Date(new Date().getTime() + template.value * 1000);
    this.trigger = trigger;
    this.active = true;
  }

  disableTrigger() {
    clearTimeout(this.trigger);
    this.active = false;
  }

  getTriggerTime() {
    return this.triggerTime;
  }
}
