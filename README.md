# NEXAVERSE — Complete Discord Bot Ecosystem

NEXAVERSE is a production-quality Discord bot featuring moderation, economy, games, achievements, giveaways, events, tickets, reports, verification, and more — all in one unified ecosystem.

---

## 🚀 RUN NEXAVERSE

### 1. Install Required Runtime

You need **Node.js 18+** and **npm** (or **bun**):

```bash
# Check if you have Node.js
node --version   # Should be v18 or higher

# Install bun (optional, faster)
npm install -g bun
```

### 2. Open the Project in VS Code

Open this project folder in VS Code:
- `File → Open Folder...` → select the `nexaverse` folder

### 3. Open Terminal

In VS Code: `Terminal → New Terminal` (or press `` Ctrl+` ``)

### 4. Install Dependencies

```bash
npm install
```

Or with bun:
```bash
bun install
```

### 5. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Copy the example
cp .env.example .env
```

Edit `.env` and fill in your values:

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `DISCORD_TOKEN` | Your bot token | [Discord Developer Portal](https://discord.com/developers/applications) → Bot → Token |
| `CLIENT_ID` | Your application ID | [Discord Developer Portal](https://discord.com/developers/applications) → General Information → Application ID |
| `GUILD_ID` | Server ID for testing (optional) | Right-click server name → Copy Server ID (enable Developer Mode in Discord settings) |
| `BOT_PREFIX` | Command prefix (default: `!`) | Any string |
| `LOG_LEVEL` | Logging verbosity | `debug`, `info`, `warn`, or `error` |

### 6. Discord Developer Portal Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a New Application → name it **NEXAVERSE**
3. Go to **Bot** → click **Add Bot**
4. Copy the **Token** → paste into `.env` as `DISCORD_TOKEN`
5. Copy the **Application ID** → paste into `.env` as `CLIENT_ID`
6. Under **Privileged Gateway Intents**, enable:
   - ✅ Presence Intent
   - ✅ Server Members Intent
   - ✅ Message Content Intent
7. Go to **OAuth2 → URL Generator**:
   - Select scopes: `bot`, `applications.commands`
   - Select permissions:
     - `Administrator` (recommended for full functionality)
     - Or at minimum: `Manage Roles`, `Manage Channels`, `Kick Members`, `Ban Members`, `Manage Messages`, `Manage Nicknames`, `Send Messages`, `Embed Links`, `Attach Files`, `Read Message History`, `Use Slash Commands`, `Manage Server`
8. Copy the generated URL → open in browser → invite to your server

### 7. Start the Bot

```bash
npm start
```

You should see:
```
[CMD] Loaded: /account
[CMD] Loaded: /economy
[CMD] Loaded: /games
...
[NEXAVERSE] Logged in as NEXAVERSE#0000
[NEXAVERSE] Serving 1 server(s)
[NEXAVERSE] 15 commands loaded
```

### 8. Deploy Commands

In a separate terminal, run:
```bash
npm run deploy
```

This registers the slash commands with Discord. Wait 1-2 minutes for commands to appear.

### 9. Stop the Bot

Press `Ctrl+C` in the terminal where the bot is running.

### 10. Restart After Changes

```bash
# Stop with Ctrl+C, then:
npm start
```

---

## 🔧 Development Mode

For automatic restarts on file changes:

```bash
npm run dev
```

This uses Node.js `--watch` mode — the bot restarts automatically when you edit files.

---

## 🏗️ Architecture

```
nexaverse/
├── package.json          # Dependencies and scripts
├── .env.example          # Environment variable template
├── README.md             # This file
└── src/
    ├── index.js          # Bot entry point
    ├── config.js         # All configuration and constants
    ├── deploy-commands.js # Command registration script
    ├── database/
    │   └── init.js       # SQLite database schema
    ├── commands/         # Slash commands
    │   ├── account.js    # /account
    │   ├── economy.js    # /economy
    │   ├── games.js      # /games
    │   ├── help.js       # /help
    │   ├── moderation.js # /moderation
    │   ├── staff.js      # /staff
    │   ├── stats.js      # /stats
    │   ├── utility.js    # /ping, /avatar, /userinfo, etc.
    │   ├── shop.js       # /shop
    │   ├── poll.js       # /poll
    │   ├── config.js     # /config
    │   ├── verify.js     # /verify
    │   └── ticket.js     # /ticket
    ├── events/           # Discord event handlers
    │   ├── ready.js
    │   ├── interactionCreate.js
    │   ├── messageCreate.js
    │   ├── guildMemberAdd.js
    │   ├── guildMemberRemove.js
    │   ├── guildMemberUpdate.js
    │   ├── messageDelete.js
    │   └── messageUpdate.js
    ├── components/       # Interactive panel handlers
    │   ├── accountPanel.js
    │   ├── economyPanel.js
    │   ├── gamesPanel.js
    │   ├── moderationPanel.js
    │   └── ticketPanel.js
    ├── systems/          # Core business logic
    │   ├── economy.js
    │   ├── xp.js
    │   ├── reputation.js
    │   ├── moderation.js
    │   ├── automod.js
    │   ├── antiRaid.js
    │   ├── achievements.js
    │   ├── games.js
    │   ├── giveaways.js
    │   ├── events.js
    │   ├── tickets.js
    │   ├── reports.js
    │   ├── appeals.js
    │   ├── partnerships.js
    │   ├── applications.js
    │   ├── verification.js
    │   ├── invites.js
    │   ├── shop.js
    │   ├── logging.js
    │   ├── notifications.js
    │   ├── polls.js
    │   └── config.js
    └── utils/
        ├── helpers.js    # Utility functions
        └── permissions.js # Staff permission system
```

---

## 🎮 Features

### Commands (Interactive Panels)
- **`/account`** — Profile, wallet, activity, reputation, achievements, stats, transactions, invites
- **`/economy`** — Daily/weekly rewards, transfers, shop, leaderboard
- **`/games`** — Roulette, coinflip, blackjack, slots, dice, higher/lower, RPS
- **`/moderation`** — Warn, timeout, kick, ban, mute, purge, slowmode, lock (Staff)
- **`/staff`** — Full staff management panel (Staff)
- **`/help`** — Categorized help panel
- **`/stats`** — Server statistics
- **`/shop`** — Browse and purchase items
- **`/poll`** — Create interactive polls
- **`/ticket`** — Create support tickets
- **`/verify`** — Account verification
- **`/config`** — Server configuration (Admin)

### Core Systems
- **Economy** — Credits, daily/weekly rewards, transfers, transactions, shop
- **Levels & XP** — XP from messages, events, games; rank progression
- **Reputation** — Trust score affecting privileges and limits
- **Games** — 7 casino games with security and payouts
- **Achievements** — 17+ achievements across all activities
- **Moderation** — Full mod toolkit with case tracking
- **Automod** — Spam, scam, caps, mentions detection
- **Anti-Raid** — Join burst detection, lockdown levels
- **Tickets** — 8-category support system
- **Reports** — User reporting with staff workflow
- **Giveaways** — Configurable with eligibility requirements
- **Events** — Create and manage server events
- **Invite Tracking** — Valid invites, farming detection
- **Logging** — Separate log channels per system
- **Staff Hierarchy** — 6-level permission system

---

## 🛠️ Troubleshooting

**Bot won't start:**
- Check that `DISCORD_TOKEN` is set correctly in `.env`
- Make sure you installed dependencies: `npm install`
- Verify Node.js version: `node --version` (needs v18+)

**Commands don't appear in Discord:**
- Run `npm run deploy`
- Wait 1-2 minutes for propagation
- Make sure `CLIENT_ID` is correct

**"Missing Access" errors:**
- Re-invite the bot with Administrator permission
- Check bot role is above roles it needs to manage

**Database errors:**
- Delete `src/database/nexaverse.db` and restart
- The bot will recreate it automatically

---

## 📋 License

Private project — NEXAVERSE Bot
