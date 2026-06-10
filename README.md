# Wiffle Ball Stats

A collaboratively developed full-stack stat tracker and live game logger and spectator for a real wiffle ball league. Built to enable the existence of persistent scorekeeping and stat tracking, computing batting and pitching statistics continuously and letting anyone spectate a live game from any device. 

To create and resume games, a user must have authentication. All other functionality, like viewing statistics, is accessible by anyone. 

**Live Website URL: [https://wiffle-ball-stats.vercel.app/](https://wiffle-ball-stats.vercel.app/)**

<!-- --- -->

<!-- ## Screenshots -->

<!-- TODO: Screenshots:
  1. Home screen (the four action buttons)
  2. Lineup builder popup
  3. Player statistics table with filters applied
  4. Player stats chart (Recharts visualization)
  5. Spectate view of a game in progress
-->

---

## Features

This site has three core features:

**1. Game Logging** (authenticated league members only)
- Build batting lineups for Away and Home teams, including defense-only players
- Log every at-bat outcome, including 1B, 2B, 3B, HR, IPHR, walks, strikeouts, fielder's choice
- With every outcome, log RBIs, outs, and optional additional comments
- Sub in pitchers with pitching change logs, and freely edit at bat outcomes with the edit button
- Save and resume in-progress games; each game is persisted to the database after every action

**2. Spectate Mode** (public)
- Browse all games (past and live) and watch a game in read-only mode
- Live games show a real-time scoreboard and play-by-play log

**3. Player Statistics** (public)
- Per-player batting stats: Batting average, hits, HRs, RBIs, walks, strikeouts, and more
- Per-player pitching stats: ERA, innings pitched, strikeouts, walks, hits allowed, and more
- Filter stats by game, date range, park, and opponent
- Aggregate all-player stats table for league-wide comparison
- Interactive charts for visualizing and comparing players' stats over time

Additional features:

**1. Deep Linking**
- Every view has a shareable URL: `#statistics/player-name`, `#game/game-id`, `#spectate/game-id`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL) |
| Charts | Recharts |
| Auth | Supabase Auth |
| Hosting | Vercel |

---

## Technical Highlights

### Append-Only Event Log
Every at-bat, pitching change, inning switch, and game state correction is stored as an ordered row in `game_logs` rather than overwriting a single game state record. This means any game can be reconstructed from these logs, resumed mid-game from any device, and historically replayed. However, loading a game requires replaying the full log sequence. See [`src/utils/fetchGame.ts`](src/utils/fetchGame.ts) and [`src/utils/buildGameDataFromRow.ts`](src/utils/buildGameDataFromRow.ts).

### Locally Stored Statistics
Instead of querying the database for each and every read-only query, tables are stored in memory through [`src/contexts/StatsDataContext.tsx`](src/contexts/StatsDataContext.tsx). This reduces the latency created when changing filters in the stat viewer, for instance, but comes at the cost of requiring the browser to store all of this data. At the scale for this project, storing the data in memory is acceptable. 

### Client-Side Stat Aggregation
The `player_game_stats` table stores raw counts per player per game (hits, at-bats, innings pitched, etc.) with no pre-computed derived stats. All aggregated statistics like batting average, ERA, and slugging happens in the browser in [`src/hooks/useComputedStats.ts`](src/hooks/useComputedStats.ts) and [`src/utils/computeAllPlayerStatistics.ts`](src/utils/computeAllPlayerStatistics.ts). As a result, any filter combination (by game, date range, opponent, park) re-aggregates the already-fetched rows without additional queries, making filtering instant and flexible without any server-side logic or DB-side computed columns.

### Local Web Setup
The [`developer_tools/scripts/local_website_setup.ps1`](developer_tools/scripts/local_website_setup.ps1) Powershell script automates the setup of the local server. It can automatically open the local host site, and allows the user with one keyboard input to close to server. 

---

## Running Locally

**Prerequisites:** Node.js, a Supabase project

```bash
# 1. Clone the repo
git clone https://github.com/noahm17/wiffle-ball-stats.git
cd wiffle-ball-stats

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Fill in your Supabase URL and publishable key in .env.local

# 4. Start the dev server
npm run dev
```

---

## Project Structure

```
src/
├── components/
│   ├── gameplayLogging/   # At-bat, pitching change, and game state logging UI
│   ├── statistics/        # Player stats tables, filters, and charts
│   ├── GameLogger.tsx     # Main logging interface
│   └── Spectate.tsx       # Read-only game viewer
├── contexts/              # React context for players and stats data
├── hooks/                 # useComputedStats aggregates raw DB rows into display stats
├── utils/                 # Stat computation, Supabase queries, game data builders
└── types.tsx              # Shared TypeScript types
```

---

