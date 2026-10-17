require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');

const {
  Client,
  Collection,
  GatewayIntentBits,
} = require('discord.js');

const {
  config,
  resolveConfigPath,
  validateConfig,
  snowflakePattern,
} = require('./utils/config');

const { createDatabase } = require('./database');
const { startKeepAlive } = require('./server');

async function main() {
  validateConfig();

  const token = process.env.DISCORD_TOKEN?.trim();
  const clientId = process.env.CLIENT_ID?.trim();

  if (!token) {
    throw new Error(
      'DISCORD_TOKEN is missing from Render environment variables.'
    );
  }

  if (!snowflakePattern.test(clientId || '')) {
    throw new Error(
      'CLIENT_ID is missing or is not a valid Discord application ID.'
    );
  }

  const logoPath = resolveConfigPath(config.assets.logo);
  const bannerPath = resolveConfigPath(config.assets.welcomeBanner);

  for (const [label, filePath] of [
    ['ZYRE MC logo', logoPath],
    ['welcome banner', bannerPath],
  ]) {
    if (!fs.existsSync(filePath)) {
      throw new Error(
        `The configured ${label} file does not exist: ${filePath}`
      );
    }
  }

  const database = createDatabase(
    resolveConfigPath(config.databasePath)
  );

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

  let keepAliveServer;
  let shuttingDown = false;

  try {
    const commandDirectory = path.join(__dirname, 'commands');

    for (
      const fileName of fs.readdirSync(commandDirectory)
        .filter((name) => name.endsWith('.js'))
    ) {
      const command = require(
        path.join(commandDirectory, fileName)
      );

      client.commands.set(command.data.name, command);
    }

    const eventDirectory = path.join(__dirname, 'events');

    for (
      const fileName of fs.readdirSync(eventDirectory)
        .filter((name) => name.endsWith('.js'))
    ) {
      const event = require(
        path.join(eventDirectory, fileName)
      );

      const handler = (...args) => {
        Promise.resolve(
          event.execute(...args, database)
        ).catch((error) => {
          console.error(
            `Discord event "${event.name}" failed:`,
            error
          );

          if (event.name === 'ready') {
            void shutdown('READY_EVENT_FAILURE', 1);
          }
        });
      };

      if (event.once) {
        client.once(event.name, handler);
      } else {
        client.on(event.name, handler);
      }
    }

    client.on('error', (error) => {
      console.error('Discord client error:', error);
    });

    client.on('warn', (message) => {
      console.warn('Discord warning:', message);
    });

    client.on('shardError', (error, shardId) => {
      console.error(
        `Discord Gateway error on shard ${shardId}:`,
        error
      );
    });

    client.on('shardDisconnect', (event, shardId) => {
      console.error(
        `Gateway shard ${shardId} disconnected. Code: ${event.code}`
      );
    });

    client.on('shardReconnecting', (shardId) => {
      console.warn(
        `Gateway shard ${shardId} is reconnecting.`
      );
    });

    client.on('shardReady', (shardId) => {
      console.info(
        `Discord Gateway shard ${shardId} is ready.`
      );
    });

    // Start the health server only after application setup.
    keepAliveServer = startKeepAlive();

    async function shutdown(reason, exitCode = 0) {
      if (shuttingDown) return;
      shuttingDown = true;

      console.info(`Shutting down: ${reason}`);

      clearTimeout(readyTimeout);

      client.destroy();

      try {
        database.close();
      } catch (error) {
        console.error('Database shutdown error:', error);
      }

      if (keepAliveServer) {
        await new Promise((resolve) => {
          keepAliveServer.close(resolve);
        });
      }

      if (exitCode !== 0) {
        process.exitCode = exitCode;
      }
    }

    const readyTimeout = setTimeout(() => {
      if (!client.isReady()) {
        console.error(
          'Discord did not become ready within 45 seconds. ' +
          'Check the Gateway logs, bot token, and privileged intents.'
        );

        void shutdown('DISCORD_READY_TIMEOUT', 1);
      }
    }, 45000);

    readyTimeout.unref();

    process.once('SIGINT', () => {
      void shutdown('SIGINT');
    });

    process.once('SIGTERM', () => {
      void shutdown('SIGTERM');
    });

    console.info('Attempting to connect to Discord Gateway...');

    await client.login(token);

    console.info('Discord login request completed.');

    if (client.isReady()) {
      console.info(
        `Discord bot is online as ${client.user.tag}.`
      );
    }
  } catch (error) {
    console.error('Discord/application startup failed:', error);

    client.destroy();

    try {
      database.close();
    } catch {}

    if (keepAliveServer) {
      await new Promise((resolve) => {
        keepAliveServer.close(resolve);
      });
    }

    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Zyre MC Bot failed to start:', error);
  process.exitCode = 1;
});