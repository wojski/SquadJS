import EventEmitter from 'events';

import async from 'async';
import moment from 'moment';

import Logger from '../logger.js';

import TailLogReader from './log-readers/tail.js';
import FTPLogReader from './log-readers/ftp.js';

export default class LogParser extends EventEmitter {
  constructor(filename = 'filename.log', options = {}) {
    super();

    options.filename = filename;

    this.players = 0;
    this.eventStore = {};

    this.linesPerMinute = 0;
    this.matchingLinesPerMinute = 0;
    this.matchingLatency = 0;
    this.parsingStatsInterval = null;

    this.numberOfEmptyResponse = 0;
    this.emptyResponseThreshold = 3;

    this.processLine = this.processLine.bind(this);
    this.logStats = this.logStats.bind(this);

    this.queue = async.queue(this.processLine);

    switch (options.mode || 'tail') {
      case 'tail':
        this.logReader = new TailLogReader(this.queue.push, options);
        break;
      case 'ftp':
        this.logReader = new FTPLogReader(this.queue.push, options);
        break;
      default:
        throw new Error('Invalid mode.');
    }
  }

  updatePlayerNumber = (players) => {
    this.players = players;
  }

  async processLine(line) {
    Logger.verbose('LogParser', 4, `Matching on line: ${line}`);

    for (const rule of this.getRules()) {
      const match = line.match(rule.regex);
      if (!match) continue;

      Logger.verbose('LogParser', 3, `Matched on line: ${match[0]}`);

      match[1] = moment.utc(match[1], 'YYYY.MM.DD-hh.mm.ss:SSS').toDate();
      match[2] = parseInt(match[2]);

      rule.onMatch(match, this);

      this.matchingLinesPerMinute++;
      this.matchingLatency += Date.now() - match[1];

      break;
    }

    this.linesPerMinute++;
  }

  getRules() {
    return [];
  }

  async watch() {
    Logger.verbose('LogParser', 1, 'Attempting to watch log file...');
    await this.logReader.watch();
    Logger.verbose('LogParser', 1, 'Watching log file...');

    this.parsingStatsInterval = setInterval(this.verifyReading, 60 * 1000);
  }

  verifyReading = async () => {
    if (this.linesPerMinute == 0) {
      this.linesPerMinute = 0;
      this.matchingLinesPerMinute = 0;
      this.matchingLatency = 0;

      this.numberOfEmptyResponse++;

      Logger.verbose('LogParser', 1, `No data from FTP when > 0 players, logged! [${this.numberOfEmptyResponse} / ${this.emptyResponseThreshold}]`);
      if (this.numberOfEmptyResponse >= this.emptyResponseThreshold) {
        Logger.verbose('LogParser', 1, `No data from FTP. Restarting FTP...`);
        this.numberOfEmptyResponse = 0;
        try {
          await this.logReader.unwatch();
        }
        catch (ex) {
          Logger.verbose('LogParser', 1, `Exception during disconnecting FTP client ${ex}`);
        }

        try {
          await this.logReader.watch();
        }
        catch (ex) {
          Logger.verbose('LogParser', 1, `Exception during connecting FTP client ${ex}`);
        }
      }
    } else {
      this.logStats();
    }
  }

  logStats = () => {
    Logger.verbose(
      'LogParser',
      1,
      `Lines parsed per minute: ${this.linesPerMinute
      } lines per minute | Matching lines per minute: ${this.matchingLinesPerMinute
      } matching lines per minute | Average matching latency: ${this.matchingLatency / this.matchingLinesPerMinute
      }ms`
    );
    this.linesPerMinute = 0;
    this.matchingLinesPerMinute = 0;
    this.matchingLatency = 0;
  }

  async unwatch() {
    await this.logReader.unwatch();

    clearInterval(this.parsingStatsInterval);
  }
}
