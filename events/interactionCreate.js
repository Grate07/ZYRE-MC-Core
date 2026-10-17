const { config } = require('../utils/config');
const { isAuthorized } = require('../utils/permissions');
const { componentsV2Options, textContainer } = require('../utils/components');
const { sendLeaderboardResponse } = require('../utils/botActions');

async function deny(interaction, message) {
  const options = componentsV2Options([textContainer(message)], { ephemeral: true });
  if (interaction.deferred || interaction.replied) {
    return interaction.followUp(options);
  }
  return interaction.reply(options);
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, database) {
    if (!interaction.inGuild() || interaction.guildId !== config.guildId) return;

    if (interaction.isButton()) {
      if (!interaction.customId.startsWith('prev_lb:') && !interaction.customId.startsWith('next_lb:')) {
        return;
      }
      if (!isAuthorized(interaction.member)) {
        await deny(interaction, `You need <@&${config.adminRoleId}> to use this command.`);
        return;
      }
      if (interaction.channelId !== config.rankChannelId) {
        await deny(interaction, `Use leaderboard controls in <#${config.rankChannelId}>.`);
        return;
      }

      const [direction, currentValue] = interaction.customId.split(':');
      const currentPage = Number(currentValue);
      if (!Number.isInteger(currentPage) || currentPage < 0) {
        await deny(interaction, 'That leaderboard page is invalid. Run /leaderboard again.');
        return;
      }
      const page = direction === 'next_lb' ? currentPage + 1 : Math.max(0, currentPage - 1);
      try {
        await sendLeaderboardResponse({
          guild: interaction.guild,
          database,
          page,
          replaceAttachments: true,
          send: (options) => interaction.update(options),
        });
      } catch (error) {
        console.error('Leaderboard pagination failed:', error);
        await deny(interaction, 'The leaderboard page could not be loaded. Please try again.');
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    if (!isAuthorized(interaction.member)) {
      await deny(interaction, `You need <@&${config.adminRoleId}> to use this command.`);
      return;
    }

    if (
      (interaction.commandName === 'rank' || interaction.commandName === 'leaderboard') &&
      interaction.channelId !== config.rankChannelId
    ) {
      await deny(interaction, `Use /${interaction.commandName} in <#${config.rankChannelId}>.`);
      return;
    }

    try {
      await command.execute({ interaction, database });
    } catch (error) {
      console.error(`Command /${interaction.commandName} failed:`, error);
      await deny(interaction, 'The command could not be completed. Please try again in a moment.');
    }
  },
};
