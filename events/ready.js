const { REST, Routes } = require('discord.js');
const { config } = require('../utils/config');

module.exports = {
  name: 'ready',
  once: true,

  async execute(client) {
    console.info(`Discord connected as ${client.user.tag}.`);

    const token = process.env.DISCORD_TOKEN;
    const clientId = process.env.CLIENT_ID;

    if (!token || !clientId || !config.guildId) {
      console.error(
        'Missing DISCORD_TOKEN, CLIENT_ID, or guildId configuration.'
      );
      return;
    }

    try {
      const commands = [...client.commands.values()].map((command) =>
        command.data.toJSON()
      );

      const rest = new REST({ version: '10' }).setToken(token);

      await rest.put(
        Routes.applicationGuildCommands(clientId, config.guildId),
        { body: commands }
      );

      console.info(
        `Successfully registered ${commands.length} guild slash commands.`
      );
    } catch (error) {
      console.error('Slash-command registration failed:', {
        message: error.message,
        status: error.status,
        code: error.code,
      });
    }
  },
};