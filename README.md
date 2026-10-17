# ZYRE MC Discord Bot

Standalone Discord.js v14 bot with Components V2-only messages, Onyx container accents, welcome banners, IP replies, SQLite XP leveling, rank cards, and paginated leaderboards.

## Before starting

1. Fill in the Discord IDs in `config.json` (guild, admin role, welcome/rules/rank/level-up channels) and milestone role IDs as needed.
2. Copy `.env.example` to `.env` and set `DISCORD_TOKEN` and `CLIENT_ID`. `GUILD_ID` can override `config.json`'s guild ID.
3. Enable Server Members and Message Content intents in the Discord Developer Portal. Invite with `bot` and `applications.commands` scopes. Grant View Channels, Send Messages, Attach Files, Read Message History, and Manage Roles; place the bot role above milestone roles.
4. Run `pnpm install` then `pnpm start` locally. `pnpm run check` performs syntax checks.

## Render

Extract the ZIP contents into the root of the Git repository connected to Render. Keep `render.yaml` and `Dockerfile` at that repository root, then deploy or sync the Blueprint. The Blueprint uses Render's Docker runtime; the Dockerfile installs Canvas's native libraries during image build and starts the bot plus Express health endpoint. Do not run `apt-get` from a Render native-runtime build command.

Set `DISCORD_TOKEN` and `CLIENT_ID` in Render. Fill Discord IDs in `config.json` or set `GUILD_ID` as an override. SQLite is stored on a persistent disk at `/var/data/levels.sqlite`; Render persistent disks require a paid service plan. The free web instance can spin down, so it is not suitable for an always-connected production bot with persistent SQLite.
