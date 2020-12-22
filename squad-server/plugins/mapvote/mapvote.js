import BasePlugin from 'squad-server/plugins/base';
import EnginesBuilder from './components/engines-builder.js';
import { NEW_GAME, CHAT_MESSAGE } from 'squad-server/server-events';
import { CHATS_ADMINCHAT } from 'squad-server/constants';
import { MAPVOTE_EXTENDED_COMMANDS } from './core/plugin-commands.js';
import MapvoteDb from './core/mapvote-db.js';

export default class MapVote extends BasePlugin {
  static get description() {
    return `The <code>Mapvote</code> plugin provides map voting functionality.\n 
        This variant of map voting allows to simplify and automatize voting process.\n
        Voting:\n
          Only one votemap process for game.\n
          Voting process take 2 minutes.\n
        Auto voting (options):\n
          Voting will be ran automatically:\n
              - after configured amount of time (default 15 minutes)\n 
              - any team has <= tickets (default 150 tickets) [Not implemented] \n
        Voting:\n
          Users can vote by provide numbers 1 to 4.\n
        Auto map selection:\n
          Automatic select 4 maps to voting process.\n
          Last x (default 4) maps are excluded from selection. (default false)\n
          Exclude x (default 1 = current) layer map name. (default false)\n
        Nomination (option):\n
          Players can nominate maps for vote, next system select 4 map from basket (nominated + automatic 4 selected by system)\n
          First nomination will trigger voting in next x (default 5) minutes. (In case [now + x] minutes > configured voting time then the config time in effect)
        [Not implemented] Whitelist wages:
          Whitelisted players votes / nomination has additional multipler (default 1.5).
        \n\n  
        Broadcast options:\n
          Broadcast voting result every x (default 30) seconds.\n
          Broadcast confirmation about vote as warning (default true).\n
        \n\n
        Player Commands:\n
         * <code>!mapvote help</code> - Show other commands players can use.\n
         * <code>!mapvote results</code> - Show the results of the current map vote.\n
         * <code>!nominate <layer></code> - Nominate the layer to the upcoming voting.\n
         * <code><layer number></code> - Vote for a layer using the layer number.\n
        \n\n 
        Admin Commands (Admin Chat Only):\n 
         * <code>!mapvote start-manual-vote</code> - Manually trigger vote process.\n
         * <code>!mapvote auto-vote-info</code> - Auto vote info.\n
         * <code>!mapvote vote-info</code> - Current vote details.\n
         * <code>!mapvote nominate-info</code> - Current nominations.\n
         * <code>!mapvote emergency-restart</code> - Restart plugin.\n
         * <code>!mapvote status</code> - Plugin status \n
         * <code>!mapvote plugin-switch</code> - On/Off plugin \n
         `;
  }

  static get defaultEnabled() {
    return false;
  }

  static get optionsSpecification() {
    return {
      voteTime: {
        required: true,
        description: 'Vote time (in seconds)',
        default: 180,
        example: 300
      },
      layerFilter: {
        required: false,
        description: 'The layers players can choose from.',
        connector: 'squadlayerpool',
        default: 'squadlayerpool'
      },
      // Auto voting
      autoVoting: {
        required: false,
        description: 'Options to configure auto-voting feature',
        default: null,
        example: {
          isEnabled: {
            required: false,
            description: 'Is feature enabled',
            default: false,
            example: true
          },
          triggers: {
            required: false,
            description: 'Available triggers. (Types: 1 - TICKET / 2 - TIME)',
            default: null,
            example: [
              {
                name: 'timeTrigger',
                type: 2,
                value: 900 // seconds
              },
              {
                name: 'ticketTrigger', // [NOT IMPLEMENTED]
                type: 1,
                value: 1200 // seconds
              }
            ]
          }
        }
      },
      // Nomination
      nomination: {
        required: false,
        description: 'Options to configure nominations',
        default: null,
        example: {
          isEnabled: {
            required: false,
            description: 'Is feature enabled',
            default: false,
            example: true
          },
          canReNominate: {
            required: false,
            description: 'Can player change his nomination',
            default: false,
            example: true
          },
          nominationDelayEnabled: {
            required: false,
            description: 'Is nomination delay enabled',
            default: false,
            example: true
          },
          nominationDelayTime: {
            required: false,
            description: 'How much time delay nomination after map start (seconds)',
            default: 300,
            example: 600
          },
          isNominationTriggerVote: {
            required: false,
            description: 'Is first nomination trigger vote process',
            default: false,
            example: true
          },
          voteDelayAfterFirstNominate: {
            required: false,
            description: 'After how many seconds start vote after first nomination',
            default: 300,
            example: 600
          }
        }
      },
      // Broadcasting
      broadcast: {
        required: false,
        description: 'Options to configure broadcasting',
        default: null,
        example: {
          enablefirstInformationBroadcasting: {
            required: false,
            description: 'Enable broadcasting information about voting',
            default: false,
            example: true
          },
          firstInformationBroadcastingDelay: {
            required: false,
            description: 'First info delay (seconds)',
            default: 60,
            example: 180
          },
          enableNominationBroadcasting: {
            required: false,
            description: 'Enable broadcasting information about first nomination',
            default: false,
            example: true
          },
          enableVoteStatusBroadcasting: {
            required: false,
            description: 'Enable broadcasting voting results',
            default: false,
            example: true
          },
          voteStatusBroadcastingDelay: {
            required: false,
            description: 'How often vote status message appear (seconds)',
            default: 30,
            example: 45
          }
        }
      },
      mapBasketOptions: {
        required: false,
        description: 'Additional map filters',
        default: null,
        customFilters: []
      }
    };
  }

  constructor(server, options, optionsRaw) {
    super(server, options, optionsRaw);

    this.database = new MapvoteDb(options.database);
    this.engines = new EnginesBuilder(server, options, this.database).Build();
  }

  async prepareToMount() {
    this.database.setupDB();
  }

  async mount() {
    this.server.on(NEW_GAME, this.onNewGame);
    this.server.on(CHAT_MESSAGE, this.onChatMessage);
  }

  async unmount() {
    this.server.removeEventListener(NEW_GAME, this.onNewGame);
    this.server.removeEventListener(CHAT_MESSAGE, this.onChatMessage);
  }

  async onNewGame() {
    console.log('[MAPVOTE_EXTENDED] NEW MAP');

    this.startNewVote();
  }

  startNewVote() {
    if (this.engines.synchro.isPluginEnabled) {
      this.engines.autoVote.startNewMap();
    }
  }

  async onChatMessage(info) {
    try {
      const voteMatch = info.message.match(MAPVOTE_EXTENDED_COMMANDS.common.vote.pattern);
      if (voteMatch && this.engines.voteEngine.voteInProgress) {
        try {
          const voteResult = await this.engines.voteEngine.makeVoteByNumber(
            parseInt(voteMatch[1]),
            info.steamID
          );
          await this.server.rcon.warn(info.steamID, voteResult.message);
        } catch (err) {
          await this.server.rcon.warn(info.steamID, err.message);
        }
      }

      const commandMatch = info.message.match(MAPVOTE_EXTENDED_COMMANDS.common.mapvote.pattern);
      const nominateMatch = info.message.match(MAPVOTE_EXTENDED_COMMANDS.common.nominate.pattern);

      if (nominateMatch) {
        if (!this.engines.autoVote.isAutoVoteStarted()) {
          await this.server.rcon.warn(info.steamID, 'Cannot nominate, no upcoming mapvote');
        } else {
          var layerName = nominateMatch[1];

          var checkResult = this.engines.nomination.isNominationAvailable(info.steamID);

          if (!checkResult.available) {
            await this.server.rcon.warn(info.steamID, checkResult.message);
          } else {
            var nominationResult = await this.engines.nomination.addNewNomination(
              layerName,
              info.steamID
            );

            await this.server.rcon.warn(info.steamID, nominationResult.message);
          }
        }
      } else {
        if (commandMatch) {
          if (info.chat === CHATS_ADMINCHAT) {
            if (
              !this.engines.synchro.isPluginEnabled &&
              (commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.admin.autoVoteInfo) ||
                commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.admin.nominateInfo) ||
                commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.admin.voteInfo) ||
                commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.admin.emergencyRestart) ||
                commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.admin.start))
            ) {
              await this.server.rcon.warn(info.steamID, `[MAPVOTE] Active: false`);
              await this.server.rcon.warn(
                info.steamID,
                `Available commands:
      !mapvote admin-help - commands
      !mapvote status - Plugin status
      !mapvote plugin-switch - On/Off plugin
      `
              );

              this.logActivity(info.steamID, info.message);
            }

            if (commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.admin.pluginStatus)) {
              await this.server.rcon.warn(
                info.steamID,
                `Plugin active: ${this.engines.synchro.isPluginEnabled}`
              );
              this.logActivity(info.steamID, info.message);
            }

            if (commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.admin.switch)) {
              this.engines.synchro.switchPlugin();

              await this.server.rcon.warn(
                info.steamID,
                `Plugin switch state to: ${this.engines.synchro.isPluginEnabled}`
              );
              this.logActivity(info.steamID, info.message);
            }

            if (commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.admin.help)) {
              await this.server.rcon.warn(
                info.steamID,
                '!mapvote start-manual-vote - Manually trigger vote process'
              );
              await this.server.rcon.warn(info.steamID, '!mapvote auto-vote-info - Auto vote info');
              await this.server.rcon.warn(
                info.steamID,
                '!mapvote vote-info - Current vote details'
              );
              await this.server.rcon.warn(
                info.steamID,
                '!mapvote nominate-info - Current nominations'
              );
              await this.server.rcon.warn(
                info.steamID,
                '!mapvote emergency-restart - Restart vote process if something bad happened'
              );
              await this.server.rcon.warn(info.steamID, '!mapvote status - Plugin status');
              await this.server.rcon.warn(info.steamID, '!mapvote plugin-switch - On/Off plugin');
              this.logActivity(info.steamID, info.message);
            }

            if (this.engines.synchro.isPluginEnabled) {
              if (commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.admin.autoVoteInfo)) {
                console.log('autoVoteInfo');

                const autoVoteInfo = this.engines.autoVote.getAutoVoteInfo();

                for (let i = 0; i < autoVoteInfo.length; i++) {
                  await this.server.rcon.warn(info.steamID, autoVoteInfo[i]);
                }
                this.logActivity(info.steamID, info.message);
              }

              if (commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.admin.nominateInfo)) {
                await this.server.rcon.warn(info.steamID, 'Nominated maps:');

                var layers = await this.engines.nomination.getNominatedMapsInfo();

                for (let i = 0; i < layers.length; i++) {
                  await this.server.rcon.warn(info.steamID, layers[i]);
                }
                this.logActivity(info.steamID, info.message);
              }

              if (commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.admin.voteInfo)) {
                await this.server.rcon.warn(info.steamID, 'Vote info:');

                var messages = await this.engines.voteEngine.getVotingInfo();

                for (let i = 0; i < messages.length; i++) {
                  await this.server.rcon.warn(info.steamID, messages[i]);
                }
                this.logActivity(info.steamID, info.message);
              }

              if (commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.admin.emergencyRestart)) {
                await this.server.rcon.warn(info.steamID, 'Plugin restarting...');

                this.startNewVote();

                this.logActivity(info.steamID, info.message);
              }

              if (commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.admin.start)) {
                if (this.engines.autoVote.triggerManually()) {
                  await this.server.rcon.warn(info.steamID, 'VoteMap started manually!');
                } else {
                  await this.server.rcon.warn(info.steamID, 'VoteMap map already happened!');
                }
                this.logActivity(info.steamID, info.message);
              }
            }
          } else {
            if (!this.engines.synchro.isPluginEnabled) {
              await this.server.rcon.warn(info.steamID, '[MAPVOTE] System disabled');

              return;
            }

            if (commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.players.help)) {
              await this.server.rcon.warn(
                info.steamID,
                '!mapvote results - Show the results of the current map vote'
              );
              await this.server.rcon.warn(
                info.steamID,
                '!nominate <layer-name> - Nominate the layer for the upcoming voting'
              );
              await this.server.rcon.warn(
                info.steamID,
                '<layer number> - After vote start, type selected map number'
              );
            }

            if (commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.players.results)) {
              if (this.engines.voteEngine.voteInProgress) {
                await this.server.rcon.warn(info.steamID, `Vote in progress`);
                var voteResults = await this.engines.voteEngine.getVotingInfo();

                for (let i = 0; i < voteResults.length; i++) {
                  await this.server.rcon.warn(info.steamID, voteResults[i]);
                }
              } else {
                var layer = this.engines.voteEngine.getResult();

                if (layer === null) {
                  if (!this.engines.autoVote.isAutoVoteStarted()) {
                    await this.server.rcon.warn(info.steamID, `Vote map not ready yet!`);
                  } else {
                    await this.server.rcon.warn(
                      info.steamID,
                      `Vote will start in ${this.engines.autoVote.getEarliestTrigger()}`
                    );
                  }
                } else {
                  await this.server.rcon.warn(info.steamID, `The next map: ${layer}`);
                }
              }
            }
          }
        }
      }
    } catch (ex) {
      this.database.addLogs({ log: ex });
    }
  }

  async logActivity(steamId, text) {
    this.database.logAdminActions({ action: text, steamId: steamId });
  }
}
