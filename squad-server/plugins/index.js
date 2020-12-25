import AutoKickUnassigned from './auto-kick-unassigned.js';
import AutoTKWarn from './auto-tk-warn.js';
import ChatCommands from './chat-commands.js';
import DBLog from './db-log.js';
import DiscordAdminBroadcast from './discord-admin-broadcast.js';
import DiscordAdminCamLogs from './discord-admin-cam-logs.js';
import DiscordAdminRequest from './discord-admin-request.js';
import DiscordChat from './discord-chat.js';
import DiscordDebug from './discord-debug.js';
import DiscordRcon from './discord-rcon.js';
import DiscordRoundWinner from './discord-round-winner.js';
import DiscordServerStatus from './discord-server-status.js';
import DiscordSubsystemRestarter from './discord-subsystem-restarter.js';
import DiscordTeamkill from './discord-teamkill.js';
import IntervalledBroadcasts from './intervalled-broadcasts.js';
import SeedingMode from './seeding-mode.js';
import TeamRandomizer from './team-randomizer.js';
import MapVote from './mapvote/mapvote.js';
import DiscordFancyServerStatus from './discord-fancy-server-status.js';
import DiscordPlayersList from './discord-players-list.js';
const plugins = [
  AutoKickUnassigned,
  AutoTKWarn,
  ChatCommands,
  DBLog,
  DiscordAdminBroadcast,
  DiscordAdminCamLogs,
  DiscordAdminRequest,
  DiscordChat,
  DiscordDebug,
  DiscordRcon,
  DiscordRoundWinner,
  DiscordServerStatus,
  DiscordSubsystemRestarter,
  DiscordTeamkill,
  IntervalledBroadcasts,
  SeedingMode,
  TeamRandomizer,
  MapVote,
  DiscordFancyServerStatus,
  DiscordPlayersList
];

const pluginsByName = {};
for (const plugin of plugins) {
  pluginsByName[plugin.name] = plugin;
}

export default pluginsByName;
