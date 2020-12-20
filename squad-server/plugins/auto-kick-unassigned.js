import BasePlugin from './base-plugin.js';

export default class AutoKickUnassigned extends BasePlugin {
  static get description() {
    return (
      'The <code>AutoKickUnassigned</code> plugin will automatically kick players that are not in a squad after a ' +
      'specified ammount of time.'
    );
  }

  static get defaultEnabled() {
    return true;
  }

  static get optionsSpecification() {
    return {
      warningMessage: {
        required: false,
        description: 'Message SquadJS will send to players warning them they will be kicked',
        default: 'Join a squad, you are are unassigned and will be kicked'
      },
      kickMessage: {
        required: false,
        description: 'Message to send to players when they are kicked',
        default: 'Unassigned - automatically removed'
      },
      frequencyOfWarnings: {
        required: false,
        description: 'How often in seconds should we warn the player about being unassigned?',
        default: 30
      },
      unassignedTimer: {
        required: false,
        description: 'How long in minutes to wait before a player that is unassigned is kicked',
        default: 6
      },
      playerThreshold: {
        required: false,
        description:
          'Player count required for AutoKick to start kicking players to disable set to -1 to disable',
        default: 93
      },
      roundStartDelay: {
        required: false,
        description:
          'Time delay in minutes from start of the round before AutoKick starts kicking again',
        default: 15
      },
      ignoreAdmins: {
        required: false,
        description: 'Whether or not admins will be auto kicked for being unassigned',
        default: false
      },
      ignoreWhitelist: {
        required: false,
        description:
          'Whether or not players in the whitelist will be auto kicked for being unassigned',
        default: false
      }
    };
  }

  /**
   * trackedPlayers[<steam64ID>] = <tracker>
   *
   *  <tracker> = {
   *         player: <playerObj>
   *       warnings: <int>
   *      startTime: <Epoch Date>
   *    warnTimerID: <intervalID>
   *    kickTimerID: <timeoutID>
   *  }
   */
  constructor(server, options, connectors) {
    super(server, options, connectors);

    this.admins = server.getAdminsWithPermission('canseeadminchat');
    this.whitelist = server.getAdminsWithPermission('reserve');

    this.kickTimeout = options.unassignedTimer * 60 * 1000;
    this.warningInterval = options.frequencyOfWarnings * 1000;
    this.gracePeriod = options.roundStartDelay * 60 * 1000;

    this.trackingListUpdateFrequency = 1 * 60 * 1000; // 1min
    this.cleanUpFrequency = 20 * 60 * 1000; // 20min

    this.betweenRounds = false;

    this.trackedPlayers = {};

    this.onNewGame = this.onNewGame.bind(this);
    this.onPlayerSquadChange = this.onPlayerSquadChange.bind(this);
    this.updateTrackingList = this.updateTrackingList.bind(this);
    this.clearDisconnectedPlayers = this.clearDisconnectedPlayers.bind(this);
  }

  async mount() {
    this.server.on('NEW_GAME', this.onNewGame);
    this.server.on('PLAYER_SQUAD_CHANGE', this.onPlayerSquadChange);
    this.updateTrackingListInterval = setInterval(
      this.updateTrackingList,
      this.trackingListUpdateFrequency
    );
    this.clearDisconnectedPlayersInterval = setInterval(
      this.clearDisconnectedPlayers,
      this.cleanUpFrequency
    );
  }

  async unmount() {
    this.server.removeEventListener('NEW_GAME', this.onNewGame);
    this.server.removeEventListener('PLAYER_SQUAD_CHANGE', this.onPlayerSquadChange);
    clearInterval(this.updateTrackingListInterval);
    clearInterval(this.clearDisconnectedPlayersInterval);
  }

  async onNewGame() {
    this.betweenRounds = true;
    await this.updateTrackingList();
    setTimeout(() => {
      this.betweenRounds = false;
    }, this.gracePeriod);
  }

  async onPlayerSquadChange(player) {
    if (player.steamID in this.trackedPlayers && player.squadID !== null)
      this.untrackPlayer(player.steamID);
  }

  async updateTrackingList(forceUpdate = false) {
    const run = !(this.betweenRounds || this.server.players.length < this.options.playerThreshold);

    this.verbose(
      3,
      `Update Tracking List? ${run} (Between rounds: ${
        this.betweenRounds
      }, Below player threshold: ${this.server.players.length < this.options.playerThreshold})`
    );

    if (!run) {
      for (const steamID of Object.keys(this.trackedPlayers)) this.untrackPlayer(steamID);
      return;
    }

    if (forceUpdate) await this.server.updatePlayerList();

    // loop through players on server and start tracking players not in a squad
    for (const player of this.server.players) {
      const isTracked = player.steamID in this.trackedPlayers;
      const isUnassigned = player.squadID === null;
      const isAdmin = player.steamID in this.admins;
      const isWhitelist = player.steamID in this.whitelist;

      // tracked player joined a squad remove them (redundant afer adding PLAYER_SQUAD_CHANGE, keeping for now)
      if (!isUnassigned && isTracked) this.untrackPlayer(player.steamID);

      if (!isUnassigned) continue;

      if (isAdmin) this.verbose(2, `Admin is Unassigned: ${player.name}`);
      if (isWhitelist) this.verbose(2, `Whitelist player is Unassigned: ${player.name}`);

      // start tracking player
      if (
        !isTracked &&
        !(isAdmin && this.options.ignoreAdmins) &&
        !(isWhitelist && this.options.ignoreWhitelist)
      )
        this.trackedPlayers[player.steamID] = this.trackPlayer({ player });
    }
  }

  async clearDisconnectedPlayers() {
    for (const steamID of Object.keys(this.trackedPlayers))
      if (!(steamID in this.server.players.map((p) => p.steamID))) this.untrackPlayer(steamID);
  }

  msFormat(ms) {
    // take in generic # of ms and return formatted MM:SS
    let min = Math.floor((ms / 1000 / 60) << 0);
    let sec = Math.floor((ms / 1000) % 60);
    min = ('' + min).padStart(2, '0');
    sec = ('' + sec).padStart(2, '0');
    return `${min}:${sec}`;
  }

  trackPlayer(info) {
    this.verbose(2, `Tracking: ${info.player.name}`);

    const tracker = {
      player: info.player,
      warnings: 0,
      startTime: Date.now()
    };

    // continuously warn player at rate set in options
    tracker.warnTimerID = setInterval(async () => {
      const msLeft = this.kickTimeout - this.warningInterval * (tracker.warnings + 1);

      // clear on last warning
      if (msLeft < this.warningInterval + 1) clearInterval(tracker.warnTimerID);

      const timeLeft = this.msFormat(msLeft);
      this.server.rcon.warn(tracker.player.steamID, `${this.options.warningMessage} - ${timeLeft}`);
      this.verbose(2, `Warning: ${tracker.player.name} (${timeLeft})`);
      tracker.warnings++;
    }, this.warningInterval);

    // set timeout to kick player
    tracker.kickTimerID = setTimeout(async () => {
      // ensures player is still Unassigned
      await this.updateTrackingList(true);

      // return if player in tracker was removed from list
      if (!(tracker.player.steamID in this.trackedPlayers)) return;

      this.server.rcon.kick(info.player.steamID, this.options.kickMessage);
      this.server.emit('PLAYER_AUTO_KICKED', {
        player: tracker.player,
        warnings: tracker.warnings,
        startTime: tracker.startTime
      });
      this.verbose(1, `Kicked: ${tracker.player.name}`);
      this.untrackPlayer(tracker.player.steamID);
    }, this.kickTimeout);

    return tracker;
  }

  untrackPlayer(steamID) {
    const tracker = this.trackedPlayers[steamID];
    clearInterval(tracker.warnTimerID);
    clearTimeout(tracker.kickTimerID);
    delete this.trackedPlayers[steamID];
    this.verbose(2, `unTrack: ${tracker.player.name}`);
  }
}
