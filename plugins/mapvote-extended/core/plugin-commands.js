const MAPVOTE_EXTENDED_COMMANDS = {
  common: {
    mapvote: {
      text: 'mapvote',
      pattern: /^!mapvote ?(.*)/
    },
    vote: {
      pattern: /^([0-9])/
    }
  },
  players: {
    help: 'help',
    results: 'results',
    nominate: 'nominate'
  },
  admin: {
    start: 'start',
    help: 'admin-help',
    autoVoteInfo: 'auto-vote-info',
    voteInfo: 'vote-info',
    nominateInfo: 'nominate-info',
    testNominate: 'test-nominate'
  }
};

export { MAPVOTE_EXTENDED_COMMANDS };
