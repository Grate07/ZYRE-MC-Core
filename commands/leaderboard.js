const { SlashCommandBuilder } = require('discord.js');
const { sendLeaderboardResponse } = require('../utils/botActions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the live Zyre MC XP leaderboard.'),
  async execute({ interaction, database }) {
    await sendLeaderboardResponse({
      guild: interaction.guild,
      database,
      send: (options) => interaction.reply(options),
      page: 0,
    });
  },
};
