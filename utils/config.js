const path = require('node:path');
const rawConfig = require('../config.json');

// Render can supply the guild and database path without changing the checked-in config.
const config = {
  ...rawConfig,
  guildId: process.env.GUILD_ID || rawConfig.guildId,
  databasePath: process.env.DB_PATH || rawConfig.databasePath,
};

const snowflakePattern = /^\d{17,20}$/;

function validateConfig() {
  const requiredIds = [
    ['guildId', config.guildId],
    ['adminRoleId', config.adminRoleId],
    ['welcomeChannelId', config.welcomeChannelId],
    ['rulesChannelId', config.rulesChannelId],
    ['rankChannelId', config.rankChannelId],
    ['levelUpChannelId', config.levelUpChannelId],
  ];
  const invalid = requiredIds
    .filter(([, value]) => !snowflakePattern.test(String(value || '')))
    .map(([name]) => name);

  if (invalid.length) {
    throw new Error(`Set valid Discord snowflake IDs in config.json: ${invalid.join(', ')}`);
  }

  if (!config.prefix || config.prefix.length > 5) {
    throw new Error('config.json prefix must contain between 1 and 5 characters.');
  }

  if (!config.serverInfo?.ip || !config.serverInfo?.bedrockPort || !config.serverInfo?.name) {
    throw new Error('config.json serverInfo must include ip, bedrockPort, and name.');
  }

  const { minXp, maxXp, cooldownSeconds } = config.xpSettings || {};
  if (
    !Number.isInteger(minXp) ||
    !Number.isInteger(maxXp) ||
    minXp < 1 ||
    maxXp < minXp ||
    !Number.isInteger(cooldownSeconds) ||
    cooldownSeconds < 0
  ) {
    throw new Error('config.json xpSettings must have valid minXp, maxXp, and cooldownSeconds values.');
  }

  if (!config.assets?.logo || !config.assets?.welcomeBanner) {
    throw new Error('config.json assets must include logo and welcomeBanner paths.');
  }
}

function resolveConfigPath(filePath) {
  return path.resolve(__dirname, '..', filePath);
}

module.exports = { config, resolveConfigPath, validateConfig, snowflakePattern };
