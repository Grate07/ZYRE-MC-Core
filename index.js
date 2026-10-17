require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const {
  Client,
  Collection,
  GatewayIntentBits,
} = require('discord.js');
const { config, resolveConfigPath, validateConfig, snowflakePattern } = require('./utils/config');
const { createDatabase } = require('./database');
const { startKeepAlive } = require('./server');

async function main() {
  validateConfig();
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  if (!token) throw new Error('DISCORD_TOKEN is missing. Add it to the environment or local .env file.');
  if (!snowflakePattern.test(String(clientId || ''))) {
    throw new Error('CLIENT_ID is missing or is not a valid Discord application ID.');
  }

  const logoPath = resolveConfigPath(config.assets.logo);
  const bannerPath = resolveConfigPath(config.assets.welcomeBanner);
  for (const [label, filePath] of [
    ['ZYRE MC logo', logoPath],
    ['welcome banner', bannerPath],
  ]) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`The configured ${label} file does not exist: ${filePath}`);
    }
  }

  const keepAliveServer = startKeepAlive();
  const database = createDatabase(resolveConfigPath(config.databasePath));
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });
  client.commands = new Collection();
  client.database = database;

  const commandDirectory = path.join(__dirname, 'commands');
  for (const fileName of fs.readdirSync(commandDirectory).filter((name) => name.endsWith('.js'))) {
    const command = require(path.join(commandDirectory, fileName));
    client.commands.set(command.data.name, command);
  }

  const eventDirectory = path.join(__dirname, 'events');
  for (const fileName of fs.readdirSync(eventDirectory).filter((name) => name.endsWith('.js'))) {
    const event = require(path.join(eventDirectory, fileName));
    const handler = (...args) => {
      Promise.resolve(event.execute(...args, database)).catch((error) => {
        console.error(`Discord event ${event.name} failed:`, error);
        if (event.name === 'ready') {
          client.destroy();
          database.close();
          keepAliveServer.close(() => {
            process.exitCode = 1;
          });
        }
      });
    };
    if (event.once) client.once(event.name, handler);
    else client.on(event.name, handler);
  }

  client.on('error', (error) => {
  console.error('Discord client error:', error);
});

client.on('warn', (message) => {
  console.warn('Discord warning:', message);
});

client.on('shardError', (error, shardId) => {
  console.error(`Discord shard ${shardId} error:`, error);
});

client.on('shardDisconnect', (event, shardId) => {
  console.error(
    `Discord shard ${shardId} disconnected. Close code: ${event.code}`
  );
});

client.on('shardReconnecting', (shardId) => {
  console.warn(`Discord shard ${shardId} is reconnecting.`);
});

  const shutdown = async (signal) => {
    console.info(`Received ${signal}; closing the Zyre MC bot.`);
    client.destroy();
    database.close();
    await new Promise((resolve) => keepAliveServer.close(resolve));
    process.exit(0);
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

try {
  console.info('Attempting to connect to Discord Gateway...');

  await client.login(token);

  console.info('Discord login succeeded.');
  } catch (error) {
    client.destroy();
    database.close();
    await new Promise((resolve) => keepAliveServer.close(resolve));
    throw error;
  }
}

main().catch((error) => {
  console.error('Zyre MC Bot failed to start:', error.message);
  process.exitCode = 1;
});
