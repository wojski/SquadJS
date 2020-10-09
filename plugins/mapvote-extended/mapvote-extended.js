import { CHATS_ADMINCHAT } from 'core/constants';
import { NEW_GAME, CHAT_MESSAGE } from 'squad-server/events';
import EnginesBuilder from './components/engines-builder.js';
import { MAPVOTE_EXTENDED_COMMANDS } from './core/plugin-commands.js';

export default {
  name: 'mapvote-extended',
  description: `The <code>mapvote-extended</code> plugin provides map voting functionality.\n 
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
       * <code>!mapvote nominate <layer></code> - Nominate the layer to the upcoming voting.\n
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
       `,

  defaultEnabled: false,
  optionsSpec: {
    voteTime: {
      required: true,
      description: 'Vote time (in minutes)',
      default: 3,
      example: 5
    },
    layerFilter: {
      required: false,
      description: 'The layers players can choose from.',
      default: 'layerFilter'
    },
    multipleLayersFromSameMap: {
      required: false,
      description: 'Can map basket get layers from same map',
      default: false,
      example: true
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
              value: 15
            },
            {
              name: 'ticketTrigger', // [NOT IMPLEMENTED]
              type: 1,
              value: 150
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
          description: 'How much time delay nomination after map start (minutes)',
          default: 5,
          example: 10
        },
        isNominationTriggerVote: {
          required: false,
          description: 'Is first nomination trigger vote process',
          default: false,
          example: true
        },
        voteDelayAfterFirstNominate: {
          required: false,
          description: 'After how many minutes start vote after first nomination',
          default: 5,
          example: 10
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
          description: 'First info delay (minutes)',
          default: 3,
          example: 3
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
    }
  },

  init: async (server, options) => {
    const engines = new EnginesBuilder(server, options).Build();

    // server.on(A2S_INFO_UPDATED, (obj) => {
    //   console.log(obj)
    // });

    server.on(NEW_GAME, () => {
      console.log('[MAPVOTE_EXTENDED] NEW MAP');

      if (engines.synchro.isPluginEnabled) {
        engines.autoVote.startNewMap();
      }
    });

    server.on(CHAT_MESSAGE, async (info) => {
      const voteMatch = info.message.match(MAPVOTE_EXTENDED_COMMANDS.common.vote.pattern);
      if (voteMatch && engines.voteEngine.voteInProgress) {
        try {
          const voteResult = await engines.voteEngine.makeVoteByNumber(
            parseInt(voteMatch[1]),
            info.steamID
          );
          await server.rcon.warn(info.steamID, voteResult.message);
        } catch (err) {
          await server.rcon.warn(info.steamID, err.message);
        }
      }

      const commandMatch = info.message.match(MAPVOTE_EXTENDED_COMMANDS.common.mapvote.pattern);

      if (commandMatch) {
        if (info.chat === CHATS_ADMINCHAT) {
          if (
            !engines.synchro.isPluginEnabled &&
            (commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.admin.autoVoteInfo) ||
              commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.admin.nominateInfo) ||
              commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.admin.voteInfo) ||
              commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.admin.emergencyRestart) ||
              commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.admin.start))
          ) {
            await server.rcon.warn(info.steamID, `[MAPVOTE] Active: false`);
            await server.rcon.warn(
              info.steamID,
              `Available commands:
!mapvote admin-help - commands
!mapvote status - Plugin status
!mapvote plugin-switch - On/Off plugin
`
            );
          }

          if (commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.admin.pluginStatus)) {
            await server.rcon.warn(
              info.steamID,
              `Plugin active: ${engines.synchro.isPluginEnabled}`
            );
          }

          if (commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.admin.switch)) {
            engines.synchro.switchPlugin();

            await server.rcon.warn(
              info.steamID,
              `Plugin switch state to: ${engines.synchro.isPluginEnabled}`
            );
          }

          if (commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.admin.help)) {
            await server.rcon.warn(
              info.steamID,
              '!mapvote start-manual-vote - Manually trigger vote process'
            );
            await server.rcon.warn(info.steamID, '!mapvote auto-vote-info - Auto vote info');
            await server.rcon.warn(info.steamID, '!mapvote vote-info - Current vote details');
            await server.rcon.warn(info.steamID, '!mapvote nominate-info - Current nominations');
            await server.rcon.warn(
              info.steamID,
              '!mapvote emergency-restart - Restart vote process if something bad happened'
            );
            await server.rcon.warn(info.steamID, '!mapvote status - Plugin status');
            await server.rcon.warn(info.steamID, '!mapvote plugin-switch - On/Off plugin');
          }

          if (engines.synchro.isPluginEnabled) {
            if (commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.admin.autoVoteInfo)) {
              console.log('autoVoteInfo');

              const autoVoteInfo = engines.autoVote.getAutoVoteInfo();

              for (let i = 0; i < autoVoteInfo.length; i++) {
                await server.rcon.warn(info.steamID, autoVoteInfo[i]);
              }
            }

            if (commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.admin.nominateInfo)) {
              await server.rcon.warn(info.steamID, 'Nominated maps:');

              var layers = await engines.nomination.getNominatedMapsInfo();

              for (let i = 0; i < layers.length; i++) {
                await server.rcon.warn(info.steamID, layers[i]);
              }
            }

            if (commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.admin.voteInfo)) {
              await server.rcon.warn(info.steamID, 'Vote info:');

              var messages = await engines.voteEngine.getVotingInfo();

              for (let i = 0; i < messages.length; i++) {
                await server.rcon.warn(info.steamID, messages[i]);
              }
            }

            if (commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.admin.emergencyRestart)) {
              await server.rcon.warn(info.steamID, 'Plugin restarting...');

              engines.autoVote.startNewMap();
            }

            if (commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.admin.start)) {
              if (engines.autoVote.triggerManually()) {
                await server.rcon.warn(info.steamID, 'VoteMap started manually!');
              } else {
                await server.rcon.warn(info.steamID, 'VoteMap map already happened!');
              }
            }
          }
        } else {
          if (!engines.synchro.isPluginEnabled) {
            await server.rcon.warn(info.steamID, '[MAPVOTE] System disabled');

            return;
          }

          if (commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.players.help)) {
            await server.rcon.warn(
              info.steamID,
              '!mapvote results - Show the results of the current map vote'
            );
            await server.rcon.warn(
              info.steamID,
              '!mapvote nominate <layer-name> - Nominate the layer for the upcoming voting'
            );
            await server.rcon.warn(
              info.steamID,
              '<layer number> - After vote start, type selected map number'
            );
          }

          if (commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.players.results)) {
            if (engines.voteEngine.voteInProgress) {
              await server.rcon.warn(info.steamID, `Vote in progress`);
            } else {
              var layer = engines.voteEngine.getResult();

              if (layer === null) {
                await server.rcon.warn(
                  info.steamID,
                  `Vote will start in ${engines.autoVote.getEarliestTrigger()}`
                );
              } else {
                await server.rcon.warn(info.steamID, `The next map: ${layer}`);
              }
            }
          }

          if (commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.players.nominate)) {
            var layerName = commandMatch[1].substr(commandMatch[1].indexOf(' ') + 1);

            var checkResult = engines.nomination.isNominationAvailable(info.steamID);

            if (!checkResult.available) {
              await server.rcon.warn(info.steamID, checkResult.message);
            } else {
              var nominationResult = await engines.nomination.addNewNomination(
                layerName,
                info.steamID
              );

              await server.rcon.warn(info.steamID, nominationResult.message);
            }
          }
        }
      }
    });
  }
};
