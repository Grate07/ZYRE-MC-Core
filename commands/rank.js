const { SlashCommandBuilder } = require('discord.js');
const { sendRankResponse } = require('../utils/botActions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Show a player rank card.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Player whose rank to show.').setRequired(false),
    ),
  async execute({ interaction, database }) {
    const user = interaction.options.getUser('user') || interaction.user;
    await sendRankResponse({
      user,
      database,
      send: (options) => interaction.reply(options),
    });
  },
};
