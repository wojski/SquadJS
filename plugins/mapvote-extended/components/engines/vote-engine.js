// Ten engine ma za zadanie obsluzyc caly proces glosowania
// - Vote start
// - Vote end
// - Status
// - Set map
// - Vote in progress
// - Vote ended
import EventEmitter from 'events';

export default class VoteEngine extends EventEmitter {
  constructor(server, options, mapBasket) {
    super();
  }

  // mapvote.on('NEW_WINNER', async (results) => {
  //     await server.rcon.broadcast(
  //       `New Map Vote Winner: ${results[0].layer.layer}. Participate in the map vote by typing "!mapvote help" in chat.`
  //     );
  //   });
}
