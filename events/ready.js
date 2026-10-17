const { REST, Routes } = require('discord.js');
const { config } = require('../utils/config');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    const token = process.env.DISCORD_TOKEN;
    const clientId = process.env.CLIENT_ID;
    const commands = [...client.commands.values()].map((command) => command.data.toJSON());
    const rest = new REST({ version: '10' }).setToken(token);

    await rest.put(Routes.applicationGuildCommands(clientId, config.guildId), {
      body: commands,
    });
    console.info(`Ready as ${client.user.tag}; registered ${commands.length} guild commands.`);
  },
};
