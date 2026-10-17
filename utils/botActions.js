const { AttachmentBuilder, SectionBuilder } = require('discord.js');
const {
  container,
  text,
  imageGallery,
  logoThumbnail,
  separator,
  componentsV2Options,
  makeLeaderboardButtons,
} = require('./components');
const { config, resolveConfigPath } = require('./config');
const { generateLeaderboard, generateRankCard } = require('./canvasGenerator');
const { requiredXpForLevel } = require('../database');

async function sendIpResponse({ userId, send }) {
  const section = new SectionBuilder()
    .addTextDisplayComponents(
      text(`## 🎮 ${config.serverInfo.name} — Server Info\nRequested by <@${userId}>`),
    )
    .setThumbnailAccessory(logoThumbnail('zyre_logo.png'));

  const message = container()
    .addSectionComponents(section)
    .addTextDisplayComponents(
      text('**Server IP**'),
      text(`\`\`\`${config.serverInfo.ip}\`\`\``),
      text('**Bedrock Port**'),
      text(`\`\`\`${config.serverInfo.bedrockPort}\`\`\``),
      text(`-# ${config.serverInfo.name} | Today at ${new Intl.DateTimeFormat('en', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: config.serverInfo.timeZone,
      }).format(new Date())}`),
    );

  return send(
    componentsV2Options([message], {
      files: [new AttachmentBuilder(resolveConfigPath(config.assets.logo), { name: 'zyre_logo.png' })],
      allowedMentions: { parse: [], users: [userId], roles: [] },
    }),
  );
}

async function sendRankResponse({ user, database, send }) {
  const record = database.getLevel(user.id);
  const rank = database.getRank(user.id);
  const username = user.globalName || user.username;
  const image = await generateRankCard({ user, username, record, rank });
  const message = container()
    .addTextDisplayComponents(text(`## Rank for <@${user.id}>`))
    .addMediaGalleryComponents(imageGallery('rank.png'));

  return send(
    componentsV2Options([message], {
      files: [new AttachmentBuilder(image, { name: 'rank.png' })],
      allowedMentions: { parse: [], users: [user.id], roles: [] },
    }),
  );
}

async function sendLeaderboardResponse({ guild, database, send, page = 0, replaceAttachments = false }) {
  const result = database.getLeaderboard(page, 10);
  const hydratedEntries = await Promise.all(
    result.entries.map(async (record) => {
      let member = guild.members.cache.get(record.userId);
      if (!member) {
        try {
          member = await guild.members.fetch(record.userId);
        } catch {
          member = null;
        }
      }
      return {
        ...record,
        username: member?.displayName || member?.user?.username || `Explorer ${record.userId.slice(-4)}`,
      };
    }),
  );

  const image = await generateLeaderboard({
    entries: hydratedEntries,
    page: result.page,
    pageCount: result.pageCount,
    totalUsers: result.totalUsers,
  });
  const message = container()
    .addTextDisplayComponents(
      text(`## 🏆 ${config.serverInfo.name} XP Leaderboard`),
      text(`Live leaderboard • Page ${result.page + 1} / ${result.pageCount}`),
    )
    .addSeparatorComponents(separator())
    .addMediaGalleryComponents(imageGallery('leaderboard.png'))
    .addActionRowComponents(makeLeaderboardButtons(result.page, result.pageCount));

  return send(
    componentsV2Options([message], {
      files: [new AttachmentBuilder(image, { name: 'leaderboard.png' })],
      replaceAttachments,
    }),
  );
}

async function sendLevelUp({ client, userId, level, xp }) {
  const channel = await client.channels.fetch(config.levelUpChannelId);
  if (!channel?.isTextBased() || !channel.send) {
    throw new Error('Configured levelUpChannelId is not a text channel.');
  }

  const needed = requiredXpForLevel(level);
  const message = container().addTextDisplayComponents(
    text('## LEVEL UP! 🎉'),
    text(`<@${userId}> reached Level ${level}!`),
    text(`Progress to next level: ${xp} / ${needed} XP`),
  );

  await channel.send(
    componentsV2Options([message], {
      allowedMentions: { parse: [], users: [userId], roles: [] },
    }),
  );
}

module.exports = {
  sendIpResponse,
  sendRankResponse,
  sendLeaderboardResponse,
  sendLevelUp,
};
