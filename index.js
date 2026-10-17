require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');

const {
  Client,
  Collection,
  GatewayIntentBits,
  Events,
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
    throw new Error('DISCORD_TOKEN is missing.');
  }

  if (!snowflakePattern.test(clientId || '')) {
    throw new Error('CLIENT_ID is missing or invalid.');
  }

  console.info('[Startup] Configuration validated.');
  console.info('[Startup] Discord token is present:', Boolean(token));
  console.info('[Startup] Client ID is valid:', Boolean(clientId));
  console.info('[Startup] Guild ID:', config.guildId);
  console.info(
    '[Startup] discord.js version:',
    require('discord.js').version
  );

  for (const [label, filePath] of [
    ['ZYRE MC logo', resolveConfigPath(config.assets.logo)],
    ['Welcome banner', resolveConfigPath(config.assets.welcomeBanner)],
  ]) {
    if (!fs.existsSync(filePath)) {
      throw new Error(
        `Configured ${label} does not exist: ${filePath}`
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
  let readyTimeout;
  let shuttingDown = false;

  async function shutdown(reason, exitCode = 0) {
    if (shuttingDown) return;

    shuttingDown = true;
    console.info(`[Shutdown] ${reason}`);

    if (readyTimeout) {
      clearTimeout(readyTimeout);
    }

    client.destroy();

    try {
      database.close();
    } catch (error) {
      console.error('[Database] Close failed:', error.message);
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

  try {
    const commandDirectory = path.join(__dirname, 'commands');

    for (const fileName of fs.readdirSync(commandDirectory)) {
      if (!fileName.endsWith('.js')) continue;

      const command = require(
        path.join(commandDirectory, fileName)
      );

      if (!command.data?.name || typeof command.execute !== 'function') {
        throw new Error(
          `Invalid command module: commands/${fileName}`
        );
      }

      client.commands.set(command.data.name, command);
    }

    const eventDirectory = path.join(__dirname, 'events');

    for (const fileName of fs.readdirSync(eventDirectory)) {
      if (!fileName.endsWith('.js')) continue;

      const event = require(
        path.join(eventDirectory, fileName)
      );

      if (!event.name || typeof event.execute !== 'function') {
        throw new Error(
          `Invalid event module: events/${fileName}`
        );
      }

      const handler = (...args) => {
        Promise.resolve(event.execute(...args, database))
          .catch((error) => {
            console.error(
              `[Event: ${event.name}] Failed:`,
              error
            );

            if (event.name === Events.ClientReady) {
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

    client.on('debug', (message) => {
      console.info(`[Discord Debug] ${message}`);
    });

    client.on('error', (error) => {
      console.error('[Discord Client Error]', error);
    });

    client.on('warn', (message) => {
      console.warn('[Discord Warning]', message);
    });

    client.on('shardError', (error, shardId) => {
      console.error(
        `[Gateway] Shard ${shardId} error:`,
        error
      );
    });

    client.on('shardDisconnect', (event, shardId) => {
      console.error(
        `[Gateway] Shard ${shardId} disconnected.`,
        `Code: ${event.code}`,
        `Reason: ${event.reason || 'Not provided'}`
      );
    });

    client.on('shardReconnecting', (shardId) => {
      console.warn(`[Gateway] Shard ${shardId} reconnecting.`);
    });

    client.on('shardReady', (shardId) => {
      console.info(`[Gateway] Shard ${shardId} is ready.`);
    });

    client.once(Events.ClientReady, (readyClient) => {
      if (readyTimeout) clearTimeout(readyTimeout);

      console.info(
        `[Ready] Bot is online as ${readyClient.user.tag}.`
      );
    });

    keepAliveServer = startKeepAlive();

    process.once('SIGINT', () => {
      void shutdown('SIGINT');
    });

    process.once('SIGTERM', () => {
      void shutdown('SIGTERM');
    });

    readyTimeout = setTimeout(() => {
      if (!client.isReady()) {
        console.error(
          '[Gateway] Bot did not become ready within 45 seconds.'
        );

        console.error(
          '[Gateway] Review the preceding Discord debug and shard logs.'
        );

        void shutdown('DISCORD_READY_TIMEOUT', 1);
      }
    }, 45000);

    console.info('[Gateway] Attempting Discord login...');

    await client.login(token);

    console.info('[Gateway] Login promise resolved.');
  } catch (error) {
    console.error('[Startup Failure]', error);

    await shutdown('STARTUP_FAILURE', 1);
  }
}

main().catch((error) => {
  console.error('[Fatal Error]', error);
  process.exitCode = 1;
});