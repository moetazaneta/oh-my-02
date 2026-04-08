# Discord Activity Bot

A Discord bot that watches your friends' anime/manga activity on AniList and posts live updates to your server. Every 5 minutes it checks for new progress, status changes, and scores — and sends a rich embed to whatever channel you configure.

![Activity update embed example](message-example.png)

## What it does

- Polls AniList for activity updates every 5 minutes
- Posts rich embeds to Discord: episode progress, manga chapters, status changes, scores, and text posts
- Filters noise — ignore certain activity types, media types, or statuses per-server or per-user
- Deduplicates — each activity is posted exactly once per server, even if multiple users track the same person
- Stores all activity history in Convex

## Stack

| Layer              | Tool                                                               |
| ------------------ | ------------------------------------------------------------------ |
| Bot process        | [discord.js](https://discord.js.org/) v14 + Bun                    |
| Backend / DB       | [Convex](https://convex.dev/) (actions, mutations, queries, crons) |
| Runtime            | [Bun](https://bun.sh/)                                             |
| Provider           | AniList GraphQL API (public, no auth required)                     |
| Types / Validation | TypeScript strict + Zod                                            |

## Setup

### 1. Prerequisites

- [Bun](https://bun.sh/) installed
- A Convex account (free tier is fine)
- A Discord application with a bot token

### 2. Clone and install

```bash
git clone <this-repo>
cd discord-activity-bot
bun install
```

### 3. Configure environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```env
DISCORD_BOT_TOKEN=your-bot-token-here
DISCORD_CLIENT_ID=your-client-id-here
CONVEX_URL=https://your-deployment-name.convex.cloud
```

**Where to find these:**

- `DISCORD_BOT_TOKEN` — [Discord Developer Portal](https://discord.com/developers/applications) → your app → Bot → Token
- `DISCORD_CLIENT_ID` — same portal → General Information → Application ID
- `CONVEX_URL` — your Convex dashboard after running `bunx convex dev` once

### 4. Deploy Convex backend

```bash
bunx convex dev      # start local dev deployment (first run sets up project)
# or
bunx convex deploy   # deploy to production
```

Set `DISCORD_BOT_TOKEN` as an environment variable in your [Convex dashboard](https://dashboard.convex.dev) under **Settings → Environment Variables**. The polling actions need it to post to Discord.

### 5. Register slash commands

```bash
bun run src/scripts/deploy-commands.ts   # if script exists, or do it via discord.js REST
```

### 6. Run the bot

```bash
bun run bot
```

The Convex backend runs independently (cron polls every 5 minutes). The bot process only handles slash commands.

## Discord Commands

All commands require **Manage Server** permission.

| Command                                      | Description                                                    |
| -------------------------------------------- | -------------------------------------------------------------- |
| `/setup channel:#channel`                    | Set the default channel for all activity updates               |
| `/track provider:anilist username:someone`   | Start tracking a user; optionally provide a `channel` override |
| `/untrack provider:anilist username:someone` | Stop tracking a user                                           |
| `/ignore scope:guild type:progress`          | Ignore an activity type server-wide                            |
| `/status`                                    | Show tracked users and current config                          |

### Supported activity types for `/ignore`

- `progress` — episode/chapter progress updates
- `status_change` — added to list, dropped, completed, etc.
- `score` — when a user rates something
- `text` — freeform text posts

## Architecture

```
Discord Server
      │
      │ slash commands
      ▼
  src/bot.ts  ──────────────────────────────────────────┐
  (discord.js)                                          │
                                               ConvexHttpClient
                                                        │
                                          ┌─────────────┴────────────┐
                              Convex Cron (every 5 min)              │
                                   │                                  │
                          convex/actions/poll.ts               convex/mutations/
                                   │                           convex/queries/
                   fan-out with 2s stagger per user
                                   │
                     convex/actions/pollUser.ts
                      ├── fetch from AniList GraphQL
                      ├── map to UnifiedActivity
                      ├── check ActivityFilter
                      ├── dedup via postedActivities table
                      └── POST to Discord REST API
```

**Key design decisions:**

- **Provider-agnostic data layer** — `UnifiedActivity` and `ActivityFilter` types know nothing about Discord. The same backend could power a Telegram bot or web UI.
- **Unified activities table** — one table for all providers, not one per provider. Raw provider data stored separately in `anilistRawActivities`.
- **Convex actions post to Discord** — no persistent discord.js client in the backend. Uses Discord REST API directly, handles 429 rate limits with retry logic.
- **No AniList OAuth** — uses the public API. Only public activity is tracked.

## Development

```bash
bun test          # run all tests
bun run lint      # oxlint
bun run format    # oxfmt
bun run typecheck # tsc --noEmit
```

Tests live in `tests/` and cover the activity filter logic and the AniList provider (including rate limit retry behaviour).

## Adding a new provider

1. Implement `IActivityProvider` from `src/providers/base.ts`
2. Add Zod schemas for the provider's API responses
3. Add a `rawActivities` table to `convex/schema.ts` for raw data storage
4. Map to `UnifiedActivity` — no Discord-specific fields allowed at this layer
5. Wire into `convex/actions/pollUser.ts`

## License

MIT
