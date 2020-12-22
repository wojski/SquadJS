import Sequelize from 'sequelize';

const { DataTypes } = Sequelize;

export default class MapvoteDb {
  constructor(database) {
    this.database = database;

    this.models = {};

    this.createModel('Nomination', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      time: {
        type: DataTypes.DATE,
        notNull: true
      },
      layer: {
        type: DataTypes.STRING
      },
      steamId: {
        type: DataTypes.STRING
      },
      isRenomination: {
        type: DataTypes.BOOLEAN
      },
      isAdded: {
        type: DataTypes.BOOLEAN
      }
    });

    this.createModel('Vote', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      time: {
        type: DataTypes.DATE,
        notNull: true
      },
      startTime: {
        type: DataTypes.DATE,
        notNull: false
      },
      layers: {
        type: DataTypes.STRING
      },
      trigger: {
        type: DataTypes.STRING
      }
    });

    this.createModel('Votes', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      time: {
        type: DataTypes.DATE,
        notNull: true
      },
      option: {
        type: DataTypes.NUMBER
      },
      steamId: {
        type: DataTypes.STRING
      }
    });

    this.createModel('Result', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      time: {
        type: DataTypes.DATE,
        notNull: true
      },
      winner: {
        type: DataTypes.INTEGER
      },
      layout: {
        type: DataTypes.STRING
      }
    });

    this.createModel('Actions', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      time: {
        type: DataTypes.DATE,
        notNull: true
      },
      action: {
        type: DataTypes.STRING
      },
      steamId: {
        type: DataTypes.STRING
      }
    });

    this.createModel('Logs', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      time: {
        type: DataTypes.DATE,
        notNull: true
      },
      log: {
        type: DataTypes.STRING
      }
    });

    this.models.Vote.hasMany(this.models.Votes, {
      foreignKey: { name: 'vote', allowNull: false },
      onDelete: 'CASCADE'
    });

    this.models.Vote.hasMany(this.models.Nomination, {
      foreignKey: { name: 'vote', allowNull: false },
      onDelete: 'CASCADE'
    });

    this.models.Vote.hasMany(this.models.Result, {
      foreignKey: { name: 'vote', allowNull: false },
      onDelete: 'CASCADE'
    });
  }

  createModel(name, schema) {
    this.models[name] = this.options.database.define(`DBMapvote_${name}`, schema, {
      timestamps: false
    });
  }

  async setupDB() {
    await this.models.Nomination.sync();
    await this.models.Vote.sync();
    await this.models.Votes.sync();
    await this.models.Result.sync();
    await this.models.Actions.sync();
    await this.models.Logs.sync();
  }

  async onNewVote() {
    this.vote = await this.models.Vote.create({
      time: new Date()
    });
  }

  async addNomination(info) {
    await this.models.Nomination.create({
      time: new Date(),
      layer: info.layer,
      steamId: info.steamId,
      isAdded: info.isAdded,
      isRenomination: info.isRenomination,
      vote: this.vote.id
    });
  }

  async startVote(info) {
    await this.models.Vote.update(
      { startTime: new Date(), layers: info.layers, trigger: info.trigger },
      { where: { id: this.vote.id } }
    );
  }

  async addVote(info) {
    await this.models.Votes.create({
      time: new Date(),
      option: info.option,
      steamId: info.steamId,
      vote: this.vote.id
    });
  }

  async finaliseVote(info) {
    await this.models.Result.create({
      time: new Date(),
      winner: info.option,
      layout: info.winner_layout,
      vote: this.vote.id
    });
  }

  async logAdminActions(info) {
    await this.models.Actions.create({
      time: new Date(),
      action: info.action,
      steamId: info.steamId
    });
  }

  async addLogs(info) {
    await this.models.Logs.create({
      time: new Date(),
      log: info.log
    });
  }
}
