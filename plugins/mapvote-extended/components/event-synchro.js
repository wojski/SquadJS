import EventEmitter from 'events';
import {
  START_NEW_MAP,
  NOMINATION_START,
  START_VOTE,
  END_VOTE,
  NOMINATION_FETCH,
  FINAL_MAP_FETCH,
  TRIGGER_START_VOTE,
  NOMINATION_TRIGGER_CREATED
} from 'mapvote-extended/constants';

export class EventSynchro extends EventEmitter {
  startNewMap() {
    console.log(`[SYNC] ${START_NEW_MAP}`);
    this.emit(START_NEW_MAP, true);
  }

  startNominate(delayTime) {
    console.log(`[SYNC] ${NOMINATION_START}`);

    this.emit(NOMINATION_START, delayTime);
  }

  nominationTriggerCreated() {
    this.emit(NOMINATION_TRIGGER_CREATED);
  }

  triggerStartVote() {
    console.log(`[SYNC] ${TRIGGER_START_VOTE}`);

    this.emit(TRIGGER_START_VOTE, true);
  }

  nominationFetched(nominations) {
    console.log(`[SYNC] ${NOMINATION_FETCH}`);

    this.emit(NOMINATION_FETCH, nominations);
  }

  finalMapsFetched(maps) {
    console.log(`[SYNC] ${FINAL_MAP_FETCH}`);

    this.emit(FINAL_MAP_FETCH, maps);
  }

  startVote() {
    console.log(`[SYNC] ${START_VOTE}`);

    this.emit(START_VOTE, true);
  }

  endVote(layer) {
    console.log(`[SYNC] ${END_VOTE}`);

    this.emit(END_VOTE, layer);
  }
}
