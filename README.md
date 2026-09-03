# 🌌 NEXAVERSE — Complete Discord Bot Ecosystem

A production-quality Discord bot with economy, games, moderation, verification, achievements, and more.

## 🚀 Quick Start

1. **Open the project in VS Code**
2. **Open Terminal** (`Ctrl+`` `)
3. **Install dependencies:**
   ```
   npm install
   ```
4. **Create `.env` file** in the project root (see Environment Variables below)
5. **Register slash commands:**
   ```
   npm run deploy
   ```
6. **Start the bot:**
   ```
   npm start
   ```
7. Bot connects to Discord and you're live!

## 🔧 Development

- **Start with auto-reload:**
  ```
  npm run dev
  ```
- **Stop:** `Ctrl+C` in terminal
- **Restart after changes:** `Ctrl+C` then `npm start` (or `npm run dev`)

## 📋 Environment Variables

Create a `.env` file in the project root with these values:

### Required
| Variable | Description |
|----------|-------------|
| `DISCORD_TOKEN` | Your bot token from [Discord Developer Portal](https://discord.com/developers/applications) |
| `CLIENT_ID` | Your bot's Application ID from the Developer Portal |
| `GUILD_ID` | Your server's Guild ID (right-click server → Copy Server ID) |

### Verification
| Variable | Description |
|----------|-------------|
| `VERIFICATION_CHANNEL_ID` | Channel ID where the bot auto-posts the verification panel and deletes all other messages |

### Role IDs
Set these to your server's actual Discord role IDs (right-click role → Copy Role ID):

| Variable | Purpose |
|----------|---------|
| `PRESIDENT_ROLE_ID` | Highest admin access |
| `CO_PRESIDENT_ROLE_ID` | Co-admin access |
| `HEAD_OF_STAFF_ROLE_ID` | Staff management |
| `SENIOR_MODERATOR_ROLE_ID` | Advanced moderation |
| `MODERATOR_ROLE_ID` | Standard moderation |
| `TRIAL_MODERATOR_ROLE_ID` | Basic moderation |
| `VERIFIED_ROLE_ID` | Assigned on verification |

### Log Channels
Set channel IDs for each log category:

| Variable | Logs |
|----------|------|
| `LOG_CHANNEL_MODERATION` | Warns, timeouts, kicks, bans |
| `LOG_CHANNEL_MEMBERS` | Joins, leaves, verification, nicknames |
| `LOG_CHANNEL_MESSAGES` | Deleted/edited messages, automod, spam |
| `LOG_CHANNEL_ECONOMY` | Transfers, rewards, purchases |
| `LOG_CHANNEL_GAMES` | Game results, wins, losses, security |
| `LOG_CHANNEL_GIVEAWAYS` | Giveaway creation, entries, winners |
| `LOG_CHANNEL_EVENTS` | Event creation, attendance, results |
| `LOG_CHANNEL_TICKETS` | Ticket creation, claims, closures |
| `LOG_CHANNEL_REPORTS` | Report creation, actions |
| `LOG_CHANNEL_SECURITY` | Raids, lockdowns, suspicious activity |
| `LOG_CHANNEL_STAFF` | Applications, decisions |

### Optional
| Variable | Default | Description |
|----------|---------|-------------|
| `BOT_PREFIX` | `!` | Legacy prefix |
| `LOG_LEVEL` | `info` | Log verbosity |

## 🎮 Commands

| Command | Description |
|---------|-------------|
| `/account` | Open account panel (profile, wallet, achievements) |
| `/account economy` | Economy panel (daily, weekly, transfers, shop) |
| `/games` | Games arcade (7 games with bet modals) |
| `/moderation` | Moderation panel (Staff only) |
| `/staff` | Staff management panel |
| `/stats` | Server statistics |
| `/shop` | Credit shop |
| `/poll` | Create interactive polls |
| `/verify` | Verify your account |
| `/config` | Server configuration (Admin only) |
| `/help` | View all commands |
| `/ping` | Bot latency |
| `/botinfo` | Bot information |
| `/serverinfo` | Server details |

## 🏗️ Project Structure

```
src/
├── index.js              # Bot entry point
├── config.js             # Configuration & constants
├── deploy-commands.js    # Slash command registration
├── database/
│   └── init.js           # SQLite database schema
├── commands/             # Slash commands (10)
├── events/               # Discord event handlers (8)
├── components/           # Interactive panels (4)
├── systems/              # Core system modules (22)
└── utils/                # Helpers & permissions
```

## 🛡️ Features

- **Verification Panel** — Auto-posts in configured channel, deletes other messages
- **Economy** — Credits, daily/weekly rewards, transfers, shop
- **Games** — Roulette, Coinflip, Blackjack, Slots, Dice, Higher/Lower, RPS
- **Moderation** — Warn, timeout, kick, ban, purge, slowmode, lock
- **Staff Hierarchy** — 6 levels from Trial Moderator to President
- **Reputation System** — Affects economy, games, and privileges
- **XP & Ranks** — 7 rank tiers with anti-farm protection
- **Automod** — Spam detection, scam links, caps abuse
- **Anti-Raid** — Join burst detection, lockdown system
- **Achievements** — 17 achievements across activity, economy, games, invites
- **Logging** — 11 separate log categories
- **All panels are ephemeral** — Only you see your own panels
- **Owner-only security** — Nobody can interact with your panels

## ⚠️ Troubleshooting

**Bot won't start:**
- Check `DISCORD_TOKEN` is valid
- Ensure `CLIENT_ID` matches your bot
- Run `npm install` if modules are missing

**Commands don't appear:**
- Run `npm run deploy` to register commands
- Wait 1-2 minutes for Discord to propagate

**Verification panel not posting:**
- Ensure `VERIFICATION_CHANNEL_ID` is set correctly
- Bot needs `Send Messages` and `Manage Messages` in that channel

**Database errors:**
- Delete `src/database/nexaverse.db` and restart (fresh database)

## 📜 License

Private — NEXAVERSE
