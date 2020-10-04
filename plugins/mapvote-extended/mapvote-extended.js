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
            - any team has <= tickets (default 150 tickets)\n
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
       * <code>!mapvote nominate</code> - Nominate the layer to the upcoming voting.\n
       * <code><layer number></code> - Vote for a layer using the layer number.\n
      \n\n 
      Admin Commands (Admin Chat Only):\n 
       * <code>!mapvote start</code> - Manually trigger vote process.\n
       * <code>!mapvote auto-vote-info</code> - Auto vote info.\n
       * <code>!mapvote vote-info</code> - Current vote details.\n`,

  defaultEnabled: false,
  optionsSpec: {
    voteTime: {
      required: true,
      description: 'Vote time (in minutes)',
      default: 3,
      example: 5
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
    // MapSelection
    mapBasket: {
      required: false, // TODO: CHANGE TO REQUIRED!
      description: 'Options to configure map basket (Filter for maps and additional options)',
      default: {
        layerFilter: null,
        doNotUseLast: 4,
        excludeLastMapNames: 1
      },
      example: {
        layerFilter: {
          required: false,
          description: 'The layers players can choose from.',
          default: 'layerFilter'
        },
        doNotUseLast: {
          required: false,
          description: 'Exclude from map basket last N layers.',
          default: 4
        },
        excludeLastMapNames: {
          required: false,
          description: 'Exclude from map basket last N map name ',
          default: 1
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
    broadcasting: {
      required: false,
      description: 'Options to configure broadcasting',
      default: null,
      example: {
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
        },
        confirmVoteAsWarning: {
          required: false,
          description: 'Display warning with vote confirmation',
          default: false,
          example: true
        }
      }
    }
  },

  init: async (server, options) => {
    const engines = new EnginesBuilder(server, options).Build();

    // let mapvote = null;

    server.on(NEW_GAME, () => {
      engines.autoVote.startNewMap();
    });

    server.on(CHAT_MESSAGE, async (info) => {
      // const voteMatch = info.message.match(/^([0-9])/);
      // if (voteMatch) {
      //   if (!mapvote) return;
      //   try {
      //     const layerName = await mapvote.makeVoteByNumber(info.steamID, parseInt(voteMatch[1]));
      //     await server.rcon.warn(info.steamID, `You voted for ${layerName}.`);
      //   } catch (err) {
      //     await server.rcon.warn(info.steamID, err.message);
      //   }
      //   await server.rcon.warn(info.steamID, COPYRIGHT_MESSAGE);
      // }

      console.log(info.message);
      console.log(MAPVOTE_EXTENDED_COMMANDS.common.mapvote.pattern);

      const commandMatch = info.message.match(MAPVOTE_EXTENDED_COMMANDS.common.mapvote.pattern);

      console.log(commandMatch);

      if (commandMatch) {
        console.log(info.steamID);
        if (info.chat === CHATS_ADMINCHAT) {
          if (commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.admin.autoVoteInfo)) {
            console.log('autoVoteInfo');

            const autoVoteInfo = engines.autoVote.getAutoVoteInfo();

            for (let i = 0; i < autoVoteInfo.length; i++) {
              await server.rcon.warn(info.steamID, autoVoteInfo[i]);
            }
          }

          if (commandMatch[1].startsWith(MAPVOTE_EXTENDED_COMMANDS.admin.help)) {
            console.log('admin help');

            await server.rcon.warn(info.steamID, '!mapvote start - Manually trigger vote process');
            await server.rcon.warn(info.steamID, '!mapvote auto-vote-info - Auto vote info');
            await server.rcon.warn(info.steamID, '!mapvote vote-info - Current vote details');
          }
        }

        if (commandMatch[1] === MAPVOTE_EXTENDED_COMMANDS.players.help) {
          // await server.rcon.warn(info.steamID, 'To vote type the layer number into chat:');
          // for (const layer of mapvote.squadLayerFilter.getLayers()) {
          //   await server.rcon.warn(info.steamID, `${layer.layerNumber} - ${layer.layer}`);
          // }
          console.log('help');

          await server.rcon.warn(
            info.steamID,
            '!mapvote results - Show the results of the current map vote'
          );
          await server.rcon.warn(
            info.steamID,
            '!mapvote nominate <layer-name> - Nominate the layer to the upcoming voting'
          );
          await server.rcon.warn(
            info.steamID,
            '<layer number> - After vote start, type selected map number'
          );

          // if (options.minVoteCount !== null)
          //   await server.rcon.warn(
          //     info.steamID,
          //     `${options.minVoteCount} votes need to be made for a winner to be selected.`
          //   );

          // await server.rcon.warn(
          //   info.steamID,
          //   'To see current results type into chat: !mapvote results'
          // );
        }

        // if (commandMatch[1].startsWith('start')) {

        //   if (mapvote) {
        //     await server.rcon.warn(info.steamID, 'A mapvote has already begun.');
        //   } else {
        //     mapvote = new MapVote(
        //       server,
        //       SquadLayerFilter.buildFromDidYouMeanList(
        //         commandMatch[1].replace('start ', '').split(', ')
        //       ),
        //       { minVoteCount: options.minVoteCount }
        //     );

        //     mapvote.on('NEW_WINNER', async (results) => {
        //       await server.rcon.broadcast(
        //         `New Map Vote Winner: ${results[0].layer.layer}. Participate in the map vote by typing "!mapvote help" in chat.`
        //       );
        //     });

        //     await server.rcon.broadcast(
        //       `A new map vote has started. Participate in the map vote by typing "!mapvote help" in chat. Map options to follow...`
        //     );
        //     await server.rcon.broadcast(
        //       mapvote.squadLayerFilter
        //         .getLayerNames()
        //         .map((layerName, key) => `${key + 1} - ${layerName}`)
        //         .join(', ')
        //     );
        //   }
        //   return;
        // }
      }

      //   if (!mapvote) {
      //     await server.rcon.warn(info.steamID, 'A map vote has not begun.');
      //     return;
      //   }

      //   if (commandMatch[1] === 'restart') {
      //     if (info.chat !== 'ChatAdmin') return;

      //     mapvote = new MapVote(server, mapvote.squadLayerFilter, {
      //       minVoteCount: options.minVoteCount
      //     });

      //     mapvote.on('NEW_WINNER', async (results) => {
      //       await server.rcon.broadcast(
      //         `New Map Vote Winner: ${results[0].layer}. Participate in the map vote by typing "!mapvote help" in chat.`
      //       );
      //     });

      //     await server.rcon.broadcast(
      //       `A new map vote has started. Participate in the map vote by typing "!mapvote help" in chat. Map options to follow...`
      //     );
      //     await server.rcon.broadcast(
      //       mapvote.squadLayerFilter
      //         .getLayerNames()
      //         .map((layerName, key) => `${key + 1} - ${layerName}`)
      //         .join(', ')
      //     );
      //     return;
      //   }

      //   if (commandMatch[1] === 'end') {
      //     if (info.chat !== 'ChatAdmin') return;

      //     const results = mapvote.getResults();

      //     if (results.length === 0)
      //       await server.rcon.broadcast(`No layer gained enough votes to win.`);
      //     else
      //       await server.rcon.broadcast(`${mapvote.getResults()[0].layer.layer} won the mapvote!`);

      //     mapvote = null;
      //     return;
      //   }

      //   if (commandMatch[1] === 'destroy') {
      //     if (info.chat !== 'ChatAdmin') return;
      //     mapvote = null;
      //     return;
      //   }

      //   if (commandMatch[1] === 'help') {
      //     await server.rcon.warn(info.steamID, 'To vote type the layer number into chat:');
      //     for (const layer of mapvote.squadLayerFilter.getLayers()) {
      //       await server.rcon.warn(info.steamID, `${layer.layerNumber} - ${layer.layer}`);
      //     }

      //     if (options.minVoteCount !== null)
      //       await server.rcon.warn(
      //         info.steamID,
      //         `${options.minVoteCount} votes need to be made for a winner to be selected.`
      //       );

      //     await server.rcon.warn(
      //       info.steamID,
      //       'To see current results type into chat: !mapvote results'
      //     );
      //   }

      //   if (commandMatch[1] === 'results') {
      //     const results = mapvote.getResults();

      //     if (results.length === 0) {
      //       await server.rcon.warn(info.steamID, 'No one has voted yet.');
      //     } else {
      //       await server.rcon.warn(info.steamID, 'The current vote counts are as follows:');
      //       for (const result of results) {
      //         await server.rcon.warn(
      //           info.steamID,
      //           `${result.layer.layerNumber} - ${result.layer.layer} (${result.votes} vote${result.votes > 1 ? 's' : ''
      //           })`
      //         );
      //       }
      //     }
      //   }
      // }
    });
  }
};
