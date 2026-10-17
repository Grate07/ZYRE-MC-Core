const { REST, Routes } = require('discord.js');
const { config } = require('../utils/config');

module.exports = {
  name: 'ready',
  once: true,

  async execute(client) {
    console.info(`Discord connected as ${client.user.tag}.`);

    try {
      const token = process.env.DISCORD_TOKEN;
      const clientId = process.env.CLIENT_ID;

      if (!token || !clientId || !config.guildId) {
        throw new Error(
          'Missing DISCORD_TOKEN, CLIENT_ID, or guildId configuration.'
        );
      }

      const commands = [...client.commands.values()].map(
        (command) => command.data.toJSON()
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
      console.error('Slash-command registration failed:', error);
    }
  },
};