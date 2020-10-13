const MAPVOTE_EXTENDED_COMMANDS = {
  common: {
    mapvote: {
      text: 'mapvote',
      pattern: /^!mapvote ?(.*)/
    },
    nominate: {
      text: 'nominate',
      pattern: /^!nominate ?(.*)/
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
    start: 'start-manual-vote',
    help: 'admin-help',
    autoVoteInfo: 'auto-vote-info',
    voteInfo: 'vote-info',
    nominateInfo: 'nominate-info',
    emergencyRestart: 'emergency-restart',
    pluginStatus: 'status',
    switch: 'plugin-switch'
  }
};

export { MAPVOTE_EXTENDED_COMMANDS };
