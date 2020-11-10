import BasePlugin from './base-plugin.js';

export default class DiscordPlaceholder extends BasePlugin {
  static get description() {
    return (
      'The <code>DiscordPlaceholder</code> plugin can be used to create placeholder messages in Discord for use by ' +
      'other plugins.'
    );
  }

  static get defaultEnabled() {
    return true;
  }

  static get optionsSpecification() {
    return {
      discordClient: {
        required: true,
        description: 'Discord connector name.',
        connector: 'discord',
        default: 'discord'
      },
      command: {
        required: false,
        description: 'Command that triggers the placeholder message.',
        default: '!placeholder'
      }
    };
  }

  constructor(server, options, optionsRaw) {
    super(server, options, optionsRaw);

    this.options.discordClient.on('message', async (message) => {
      // check the author of the message is not a bot
      if (message.author.bot || !message.content.toLowerCase().startsWith(this.options.command))
        return;

      await message.channel.send('Placeholder.');
    });
  }
}
