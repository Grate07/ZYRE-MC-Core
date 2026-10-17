const { AttachmentBuilder, SectionBuilder } = require('discord.js');
const {
  container,
  text,
  imageGallery,
  componentsV2Options,
  separator,
} = require('../utils/components');
const { config, resolveConfigPath } = require('../utils/config');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    if (member.guild.id !== config.guildId) return;

    const channel = await member.guild.channels.fetch(config.welcomeChannelId);
    if (!channel?.isTextBased() || !channel.send) {
      throw new Error('Configured welcomeChannelId is not a text channel.');
    }

    const section = new SectionBuilder()
      .addTextDisplayComponents(text(`## Welcome to ${config.serverInfo.name}`))
      .setThumbnailAccessory(
        new (require('discord.js').ThumbnailBuilder)().setURL(
          member.user.displayAvatarURL({ extension: 'png', size: 128 }),
        ),
      );

    const welcome = container()
      .addSectionComponents(section)
      .addTextDisplayComponents(
        text(
          `Welcome to our community, <@${member.id}>! We are absolutely thrilled to have you here.\n\nMake sure to read through <#${config.rulesChannelId}> before you get started!\n\nYou are our **${member.guild.memberCount}th explorer!**`,
        ),
        text('🎯 Server IP:'),
        text(`\`\`\`${config.serverInfo.ip}\`\`\``),
        text(`🎯 Bedrock Port: \`\`\`${config.serverInfo.bedrockPort}\`\`\``),
      )
      .addSeparatorComponents(separator())
      .addMediaGalleryComponents(imageGallery('zyre_banner.png'));

    await channel.send(
      componentsV2Options([welcome], {
        files: [
          new AttachmentBuilder(resolveConfigPath(config.assets.welcomeBanner), {
            name: 'zyre_banner.png',
          }),
        ],
        allowedMentions: { parse: [], users: [member.id], roles: [], repliedUser: false },
      }),
    );
  },
};
