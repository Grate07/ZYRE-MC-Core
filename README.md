# ZYRE MC Discord Bot

A Discord.js v14 bot with Components V2-only messages, welcome banners, IP responses, SQLite XP leveling, rank cards, and a paginated leaderboard.

## Configure and run

1. Set `guildId`, `adminRoleId`, `welcomeChannelId`, `rulesChannelId`, `rankChannelId`, and `levelUpChannelId` in `config.json`. Replace the `ROLE_ID_HERE` values if you want milestone roles.
2. Copy `.env.example` to `.env`; set `DISCORD_TOKEN` and `CLIENT_ID`. Set `GUILD_ID` only if it should override the config value.
3. Enable the Server Members and Message Content intents in the Discord Developer Portal. Invite the bot with the `bot` and `applications.commands` scopes. Grant View Channels, Send Messages, Attach Files, Read Message History, and Manage Roles; move the bot's role above milestone roles.
4. Run `pnpm install`, then `pnpm start`. Run `pnpm run check` for syntax checks. To recreate the image assets from the supplied source logo, run `pnpm run generate:assets`.

All slash and prefix commands require the configured admin role or Discord Administrator permission. `/rank` and `/leaderboard` are limited to the configured rank channel. Automatic IP replies work in any channel in the configured guild.

## Render

The included `render.yaml` is a Render Blueprint. Deploy it from a Git repository containing the extracted ZIP. Set `DISCORD_TOKEN` and `CLIENT_ID` in Render's environment; set Discord IDs in `config.json` or use `GUILD_ID` for the guild. The Blueprint mounts a persistent disk for the SQLite database; Render persistent disks require a paid service plan.

Every bot message uses a Components V2 container with Onyx accent `0x0F0F0F`. The banner and rank artwork retain the requested ZYRE purple/blue visual treatment.
