const { SlashCommandBuilder } = require('discord.js');
const { config } = require('../utils/config');
const { componentsV2Options, text, textContainer } = require('../utils/components');

function showId(value) {
  return /^\d{17,20}$/.test(String(value || '')) ? `<#${value}>` : 'Not configured';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Show the current Zyre MC bot configuration.'),
  async execute({ interaction }) {
    const summary = [
      `## ${config.serverInfo.name} Bot Configuration`,
      `**Guild:** ${config.guildId}`,
      `**Admin role:** <@&${config.adminRoleId}>`,
      `**Welcome channel:** ${showId(config.welcomeChannelId)}`,
      `**Rules channel:** ${showId(config.rulesChannelId)}`,
      `**Rank channel:** ${showId(config.rankChannelId)}`,
      `**Level-up channel:** ${showId(config.levelUpChannelId)}`,
      `**Server IP:** ${config.serverInfo.ip}`,
      `**Bedrock port:** ${config.serverInfo.bedrockPort}`,
      `**XP range:** ${config.xpSettings.minXp}–${config.xpSettings.maxXp}`,
      `**XP cooldown:** ${config.xpSettings.cooldownSeconds} seconds`,
      `**Prefix:** \`${config.prefix}\``,
    ].join('\n');
    const card = textContainer(summary);
    card.addTextDisplayComponents(text('\nEdit config.json and restart the bot to apply changes.'));
    await interaction.reply(componentsV2Options([card], { ephemeral: true }));
  },
};
