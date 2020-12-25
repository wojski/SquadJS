import DiscordBasePlugin from './discord-base-plugin.js';
import Sequelize from 'sequelize';

const { DataTypes } = Sequelize;

export default class DiscordIntervalUpdatedMessage extends DiscordBasePlugin {
    static get optionsSpecification() {
        return {
            ...super.optionsSpecification,
            subscribeMessage: {
                description: 'Trigger message to start the broadcast on the channel',
                default: '!start'
            },
            unsubscribeMessage: {
                description: 'Trigger message to stop the broadcast on this channel',
                default: '!stop'
            },
            interval: {
                description: 'Update interval in seconds',
                default: 300
            },
            storage: {
                description: 'Storrage connector name',
                connector: 'databaseClient',
                default: 'sqlite'
            }
        };
    }

    constructor(server, options, connectors) {
        super(server, options, connectors);

        this.server = server;

        this.subscribeMessage = this.options.subscribeMessage;
        this.unsubscribeMessage = this.options.unsubscribeMessage;
        this.interval = this.options.interval;
        this.storage = this.options.storage;
    }

    prepareToMount = async () => {
        await this.setupDatabase();
    }

    mount = async() => {
        this.setupMessageTriggers();
        this.setupUpdateInterval();
    }

    unmount = async () => {
        clearInterval(this.interval);
        this.options.discordClient.removeListener('message', this.onMessageTrigger);
    }

    async setupDatabase() {
        try {
            const tableName = this.constructor.name + '_DiscordIntervalUpdateMessage';
            this.DiscordBrodcastDestination = this.storage.define(tableName, {
                channelId: DataTypes.STRING,
                messageId: DataTypes.STRING
            });
            await this.storage.sync();
        } catch (e) {
            console.error(e);
        }
    }

    setupMessageTriggers = () => {
        this.options.discordClient.on('message', this.onMessageTrigger);
    }

    onMessageTrigger = async (message) => {
        if (message.content === this.subscribeMessage) {
            await this.subscribeDiscordDesination(this.server, message.channel);
        } else if (message.content === this.unsubscribeMessage) {
            await this.unsubscribeDiscordDestination(message.channel.id);
        }
    }

    setupUpdateInterval = () => {
        this.interval = setInterval(this.onUpdateInterval, this.interval * 1000);

        // this.options.discordClient.setInterval(this.onUpdateInterval);
    }

    onUpdateInterval = async () => {
        this.DiscordBrodcastDestination.findAll()
            .then((bordcastsArray) => {
                bordcastsArray.every(async (brodcast) => {
                    try {
                        const channel = await this.options.discordClient.channels.fetch(brodcast.channelId);
                        const message = await channel.messages.fetch(brodcast.messageId);

                        await message.edit(this.buildMessage(this.server));
                    } catch (e) {
                        if (e.httpStatus === 404) {
                            await this.DiscordBrodcastDestination.destroy({ where: { id: brodcast.id } });
                        } else {
                            console.error(e);
                        }
                    }
                });
            })
            .catch((e) => console.error(e));
    };


    subscribeDiscordDesination = async (server, channel) => {
        const messageId = await this.writeMessageToChannel(server, channel);
        const brodcast = this.DiscordBrodcastDestination.build({
            channelId: channel.id,
            messageId: messageId
        });
        await brodcast.save();
    }

    writeMessageToChannel = async (server, channel) => {
        const message = await channel.send(this.buildMessage(server));
        return message.id;
    }

    buildMessage = (server) => {
        return 'Override me !';
    }

    unsubscribeDiscordDestination = async (channelId) => {
        await this.DiscordBrodcastDestination.destroy({ where: { channelId: channelId } });
    }
}