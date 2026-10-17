const { config } = require('../utils/config');
const { isAuthorized } = require('../utils/permissions');
const { componentsV2Options, textContainer } = require('../utils/components');
const { sendIpResponse, sendRankResponse, sendLeaderboardResponse, sendLevelUp } = require('../utils/botActions');

async function replyText(message, content) {
  return message.reply(componentsV2Options([textContainer(content)]));
}

async function awardMessageXp(message, database) {
  const now = Math.floor(Date.now() / 1000);
  const result = database.awardXp(message.author.id, now, config.xpSettings);
  if (!result.awarded || !result.levelledUp) return;

  const roleId = config.levelRoles[String(result.record.level)];
  if (roleId && roleId !== 'ROLE_ID_HERE' && /^\d{17,20}$/.test(roleId)) {
    try {
      await message.member.roles.add(roleId, `Reached level ${result.record.level}`);
    } catch (error) {
      console.error(`Could not assign the configured level ${result.record.level} role:`, error.message);
    }
  }

  await sendLevelUp({
    client: message.client,
    userId: message.author.id,
    level: result.record.level,
    xp: result.record.xp,
  });
}

module.exports = {
  name: 'messageCreate',
  async execute(message, database) {
    if (message.author.bot || !message.guild || message.guild.id !== config.guildId) return;

    try {
      await awardMessageXp(message, database);
    } catch (error) {
      console.error('Failed to award message XP:', error);
    }

    const normalized = message.content.trim().toLowerCase();
    const serverIp = config.serverInfo.ip.toLowerCase();
    if (normalized === 'ip' || normalized === serverIp) {
      await sendIpResponse({
        userId: message.author.id,
        send: (options) => message.reply(options),
      });
      return;
    }

    const prefix = config.prefix.toLowerCase();
    if (!normalized.startsWith(prefix)) return;
    const [commandName, ...args] = normalized.slice(prefix.length).trim().split(/\s+/);
    if (!['rank', 'leaderboard', 'ip'].includes(commandName)) return;

    if (!isAuthorized(message.member)) {
      await replyText(message, `You need <@&${config.adminRoleId}> to use this command.`);
      return;
    }

    if (commandName === 'rank' || commandName === 'leaderboard') {
      if (message.channelId !== config.rankChannelId) {
        await replyText(message, `Use \`${config.prefix}${commandName}\` in <#${config.rankChannelId}>.`);
        return;
      }
    }

    if (commandName === 'ip') {
      await sendIpResponse({
        userId: message.author.id,
        send: (options) => message.reply(options),
      });
    } else if (commandName === 'rank') {
      const mentionedUser = message.mentions.users.first();
      const user = mentionedUser || message.author;
      await sendRankResponse({
        user,
        database,
        send: (options) => message.reply(options),
      });
    } else {
      await sendLeaderboardResponse({
        guild: message.guild,
        database,
        send: (options) => message.reply(options),
        page: Number.isInteger(Number(args[0])) ? Math.max(0, Number(args[0]) - 1) : 0,
      });
    }
  },
};
