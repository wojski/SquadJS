import BasePlugin from '../base-plugin.js';
import EnginesBuilder from './components/engines-builder.js';
import { MAPVOTE_COMMANDS } from './core/plugin-commands.js';
import MapvoteDb from './core/mapvote-db.js';
import Vote from './components/vote.js';

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
      database: {
        required: true,
        connector: 'sequelize',
        description: 'The Sequelize connector to log server information to.',
        default: 'mysql'
      },
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

  constructor(server, options, connectors) {
    super(server, options, connectors);

    this.database = new MapvoteDb(this.options.database);
    this.engineBuilder = new EnginesBuilder(this.server, this.options, this.database);
  }

  prepareToMount = async () => {
    this.database.setupDB();
  }

  mount = async () => {
    this.server.on('NEW_GAME', this.onNewGame);
    this.server.on('CHAT_MESSAGE', this.onChatMessage);

    this.vote = new Vote(this.engineBuilder.Build());
  }

  unmount = async () => {
    this.server.removeEventListener('NEW_GAME', this.onNewGame);
    this.server.removeEventListener('CHAT_MESSAGE', this.onChatMessage);
  }

  onNewGame = async () => {
    console.log('[MAPVOTE_COMMANDS] NEW MAP');

    this.initNewVoteProcess();
  }

  initNewVoteProcess = () => {
    if (this.vote.isPluginEnabled()) {
      if (this.vote != null) {
        // Cleanup to prevent multi instance
        this.vote.destroy();
      }

      // Vote with ctor has all engines inside + supervise all actions
      this.vote = new Vote(this.engineBuilder.Build());
      this.vote.startVote();
    }
  }

  onChatMessage = async (info) => {
    try {
      const voteMatch = info.message.match(MAPVOTE_COMMANDS.common.vote.pattern);
      if (voteMatch && this.vote.isVoteInProgress()) {
        try {
          const voteResult = await this.vote.makeVoteByNumber(
            parseInt(voteMatch[1]),
            info.steamID
          );
          await this.server.rcon.warn(info.steamID, voteResult.message);
        } catch (err) {
          await this.server.rcon.warn(info.steamID, err.message);
        }
      }

      const commandMatch = info.message.match(MAPVOTE_COMMANDS.common.mapvote.pattern);
      const nominateMatch = info.message.match(MAPVOTE_COMMANDS.common.nominate.pattern);

      if (nominateMatch) {
        if (!this.vote.isAutoVoteStarted()) {
          await this.server.rcon.warn(info.steamID, 'Cannot nominate, no upcoming mapvote');
        } else {
          var layerName = nominateMatch[1];

          var checkResult = this.vote.isNominationAvailable(info.steamID);

          if (!checkResult.available) {
            await this.server.rcon.warn(info.steamID, checkResult.message);
          } else {
            var nominationResult = await this.vote.addNewNomination(
              layerName,
              info.steamID
            );

            await this.server.rcon.warn(info.steamID, nominationResult.message);
          }
        }
      } else {
        if (commandMatch) {
          if (info.chat === 'ChatAdmin') {
            this.logAdminActivity(info.steamID, info.message);
            if (
              !this.vote.isPluginEnabled() &&
              (commandMatch[1].startsWith(MAPVOTE_COMMANDS.admin.autoVoteInfo) ||
                commandMatch[1].startsWith(MAPVOTE_COMMANDS.admin.nominateInfo) ||
                commandMatch[1].startsWith(MAPVOTE_COMMANDS.admin.voteInfo) ||
                commandMatch[1].startsWith(MAPVOTE_COMMANDS.admin.emergencyRestart) ||
                commandMatch[1].startsWith(MAPVOTE_COMMANDS.admin.start))
            ) {
              await this.server.rcon.warn(info.steamID, `[MAPVOTE] Active: false`);
              await this.server.rcon.warn(
                info.steamID,
                `Available commands:
                  !mapvote admin-help - commands
                  !mapvote status - Plugin status
                  !mapvote plugin-switch - On/Off plugin`
              );
            }

            if (commandMatch[1].startsWith(MAPVOTE_COMMANDS.admin.pluginStatus)) {
              await this.server.rcon.warn(
                info.steamID,
                `Plugin active: ${this.vote.isPluginEnabled()}`
              );
            }

            if (commandMatch[1].startsWith(MAPVOTE_COMMANDS.admin.switch)) {
              this.vote.switchPlugin();

              await this.server.rcon.warn(
                info.steamID,
                `Plugin switch state to: ${this.vote.isPluginEnabled()}`
              );
            }

            if (commandMatch[1].startsWith(MAPVOTE_COMMANDS.admin.help)) {
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
            }

            if (this.vote.isPluginEnabled()) {
              if (commandMatch[1].startsWith(MAPVOTE_COMMANDS.admin.autoVoteInfo)) {
                console.log('autoVoteInfo');

                const autoVoteInfo = this.vote.getAutoVoteInfo();

                for (let i = 0; i < autoVoteInfo.length; i++) {
                  await this.server.rcon.warn(info.steamID, autoVoteInfo[i]);
                }
              }

              if (commandMatch[1].startsWith(MAPVOTE_COMMANDS.admin.nominateInfo)) {
                await this.server.rcon.warn(info.steamID, 'Nominated maps:');

                var layers = await this.vote.getNominatedMapsInfo();

                for (let i = 0; i < layers.length; i++) {
                  await this.server.rcon.warn(info.steamID, layers[i]);
                }
              }

              if (commandMatch[1].startsWith(MAPVOTE_COMMANDS.admin.voteInfo)) {
                await this.server.rcon.warn(info.steamID, 'Vote info:');

                var messages = await this.vote.getVotingInfo();

                for (let i = 0; i < messages.length; i++) {
                  await this.server.rcon.warn(info.steamID, messages[i]);
                }
              }

              if (commandMatch[1].startsWith(MAPVOTE_COMMANDS.admin.emergencyRestart)) {
                await this.server.rcon.warn(info.steamID, 'Plugin restarting...');

                this.initNewVoteProcess();
              }

              if (commandMatch[1].startsWith(MAPVOTE_COMMANDS.admin.start)) {
                if (this.vote.triggerManually()) {
                  await this.server.rcon.warn(info.steamID, 'VoteMap started manually!');
                } else {
                  await this.server.rcon.warn(info.steamID, 'VoteMap map already happened!');
                }
              }
            }
          } else {
            if (!this.vote.isPluginEnabled()) {
              await this.server.rcon.warn(info.steamID, '[MAPVOTE] System disabled');

              return;
            }

            if (commandMatch[1].startsWith(MAPVOTE_COMMANDS.players.help)) {
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

            if (commandMatch[1].startsWith(MAPVOTE_COMMANDS.players.results)) {
              if (this.vote.isVoteInProgress()) {
                await this.server.rcon.warn(info.steamID, `Vote in progress`);
                var voteResults = await this.vote.getVotingInfo();

                for (let i = 0; i < voteResults.length; i++) {
                  await this.server.rcon.warn(info.steamID, voteResults[i]);
                }
              } else {
                var layer = this.vote.getResult();

                if (layer === null) {
                  if (!this.vote.isAutoVoteStarted()) {
                    await this.server.rcon.warn(info.steamID, `Vote map not ready yet!`);
                  } else {
                    await this.server.rcon.warn(
                      info.steamID,
                      `Vote will start in ${this.vote.getEarliestTrigger()}`
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

  logAdminActivity = async (steamId, text) => {
    this.database.logAdminActions({ action: text, steamId: steamId });
  }

  logActivity = async (steamId, text) => {
    this.database.logActions({ action: text, steamId: steamId });
  }
}
