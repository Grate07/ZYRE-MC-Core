const { SlashCommandBuilder } = require('discord.js');
const { sendIpResponse } = require('../utils/botActions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ip')
    .setDescription('Show the Zyre MC server address and Bedrock port.'),
  async execute({ interaction }) {
    await sendIpResponse({
      userId: interaction.user.id,
      send: (options) => interaction.reply(options),
    });
  },
};
