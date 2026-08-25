import { tool, type StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { loadLeagueData } from './leagueData.js';
import { computeAllPlayerStatistics } from '../../src/utils/computeAllPlayerStatistics.js';
import {
    battingAverage,
    calculateBattingAverage,
    calculateERA,
    calculateOnBasePercentage,
    calculateOnBasePlusSlugging,
    calculateSluggingPercentage,
    calculateTotalBases,
    calculateWHIP,
    era,
    formatStreak,
    onBasePercentage,
    onBasePlusSlugging,
    playerName,
    sluggingPercentage,
    whip,
    type Player,
    type PlayerGameData,
} from '../../src/stats-core.js';

// Stat abbreviations, given to the model in the get_player_stats description so it
// knows what the returned keys mean.
const GLOSSARY = [
    'PA = plate appearances, AB = at bats, H = hits, 1B/2B/3B = singles/doubles/triples',
    'HR = home runs (this total already includes inside the park home runs)',
    'IPHR = inside the park home runs, RBI = runs batted in, BB = walks, FC = fielders choice',
    'K = strikeouts (swinging + looking), TB = total bases',
    'AVG = batting average, OBP = on base percentage, SLG = slugging, OPS = OBP + SLG',
    'IP = innings pitched, ERA = earned run average, WHIP = walks and hits per inning pitched',
    'BF = batters faced',
    'G = games played'
].join('; ');

// Formats a pitched-outs count as baseball innings notation: 1.2 means 1 inning + 2 outs.
function formatInningsPitched(pitchedOuts: number): string {
    return `${Math.floor(pitchedOuts / 3)}.${pitchedOuts % 3}`;
}

// Case-insensitive name lookup. Returns the player, or a message explaining the miss
// that gets handed straight back to the model so it can correct itself and retry.
function resolvePlayer(players: Player[], query: string): Player | { error: string } {
    const normalized = query.trim().toLowerCase();

    const exact = players.filter(p => playerName(p).toLowerCase() === normalized);
    if (exact.length === 1) return exact[0];

    const partial = players.filter(p =>
        playerName(p).toLowerCase().includes(normalized) ||
        p.firstName.toLowerCase() === normalized ||
        p.lastName.toLowerCase() === normalized
    );
    if (partial.length === 1) return partial[0];

    if (partial.length > 1) {
        return {
            error: `"${query}" matches more than one player: ${partial.map(playerName).join(', ')}. ` +
                `Ask which one is meant, or call get_player_stats again with a full name.`,
        };
    }
    return {
        error: `No player named "${query}" is in this league. ` +
            `The league members are: ${players.map(playerName).join(', ')}.`,
    };
}

// Shapes an aggregated stat row for the model: drops the sentinel id/game_id fields that
// computeAllPlayerStatistics sets on aggregates, and adds the rate stats (which are computed,
// not stored). 
function shapeStats(name: string, s: PlayerGameData) {
    return {
        player: name,
        batting: {
            games_played: s.games_played,
            plate_appearances: s.plate_appearances,
            at_bats: s.at_bats,
            hits: s.hits,
            singles: s.singles,
            doubles: s.doubles,
            triples: s.triples,
            home_runs: s.home_runs,
            inside_the_park_home_runs: s.inside_the_park_home_runs,
            runs_batted_in: s.runs_batted_in,
            walks: s.walks,
            fielders_choice: s.fielders_choice,
            strikeouts: s.strikeouts,
            strikeouts_swinging: s.strikeouts_swinging,
            strikeouts_looking: s.strikeouts_looking,
            total_bases: calculateTotalBases(s),
            batting_average: calculateBattingAverage(s),
            on_base_percentage: calculateOnBasePercentage(s),
            slugging_percentage: calculateSluggingPercentage(s),
            ops: calculateOnBasePlusSlugging(s),
        },
        pitching: {
            games_pitched: s.games_pitched,
            // pitched_outs is the real number; use it for any arithmetic.
            pitched_outs: s.pitched_outs,
            // Baseball notation for display only: "1.2" means 1 inning + 2 outs, NOT 1.2 innings.
            innings_pitched: formatInningsPitched(s.pitched_outs),
            batters_faced: s.batters_faced,
            runs_allowed: s.runs_allowed,
            hits_allowed: s.hits_allowed,
            home_runs_allowed: s.home_runs_allowed,
            pitched_walks: s.pitched_walks,
            pitched_strikeouts: s.pitched_strikeouts,
            pitched_strikeouts_swinging: s.pitched_strikeouts_swinging,
            pitched_strikeouts_looking: s.pitched_strikeouts_looking,
            era: calculateERA(s),
            whip: calculateWHIP(s),
        },
        record: {
            wins: s.win,
            losses: s.loss,
            current_streak: formatStreak(s.current_streak),
            longest_win_streak: s.longest_win_streak,
            longest_loss_streak: s.longest_loss_streak,
        },
    };
}

export const listPlayers = tool(
    async () => {
        const { players, playerGameStats } = await loadLeagueData();
        const idsWithStats = new Set(playerGameStats.map(r => r.player_id));
        return JSON.stringify(
            players.map(p => ({
                name: playerName(p),
                hasStats: idsWithStats.has(p.id),
            }))
        );
    },
    {
        name: 'list_players',
        description: `\
            Lists every member of the wiffle ball league and whether they have recorded any stats.
            Call this when the user asks who is in the league, you need context as it relates to all
            of the members currently in the league, or when you need the correct spelling of a name 
            before calling get_player_stats. A player with hasStats false has played zero official games.`,
        schema: z.object({}),
    }
);

export const getPlayerStats = tool(
    async ({ playerName: query }: { playerName: string }) => {
        const { players, playerGameStats } = await loadLeagueData();

        const resolved = resolvePlayer(players, query);
        if ('error' in resolved) return resolved.error;

        // A rostered player who has never played still gets a zeroed row, so the set of
        // statless ids is what distinguishes "no games" from "all zeros in real games".
        const [statsById, playerIdsWithoutStats] = computeAllPlayerStatistics(playerGameStats, { batterIds: players });
        if (playerIdsWithoutStats.has(resolved.id)) {
            return `${playerName(resolved)} is in the league but has not played in any official ruleset game, so there are no stats to report.`;
        }

        const stats = statsById.get(resolved.id);
        if (!stats) return `No stats found for ${playerName(resolved)}.`;

        return JSON.stringify(shapeStats(playerName(resolved), stats));
    },
    {
        name: 'get_player_stats',
        description: `\
            Gets the complete career batting, pitching, and win/loss totals for ONE named player, 
            across every official ruleset game. Call this whenever the user asks about a specific 
            player's performance. It takes a single player name, so it cannot answer league-wide 
            questions like "who leads in home runs" - say you cannot look that up rather than 
            calling this once per player. If the name does not match, the tool replies with the 
            valid names so you can retry. 
            Stat abbreviations: ${GLOSSARY}. 
            Note innings_pitched is baseball notation where "1.2" means 1 inning plus 2 outs, not 
            1.2 innings; use pitched_outs for any calculation.`,
        schema: z.object({
            playerName: z.string().describe('Full name of the player, e.g. "Noah Maier"'),
        }),
    }
);

// Rankable stats, restricted to numeric fields that exist on PlayerGameData so the handler
// can index them directly. `satisfies` makes a typo or a renamed column a compile error while
// `as const` keeps the literal tuple z.enum needs.
// Deliberately excluded: id / player_id / game_id (not stats), and innings_pitched (stored in
// baseball notation where 1.2 means 1 inning plus 2 outs, so sorting it is wrong - rank by
// pitched_outs instead).
const LEADERBOARD_STATS = [
    // Batting
    'games_played',
    'plate_appearances',
    'at_bats',
    'hits',
    'singles',
    'doubles',
    'triples',
    'home_runs',
    'inside_the_park_home_runs',
    'runs_batted_in',
    'walks',
    'fielders_choice',
    'strikeouts',
    'strikeouts_swinging',
    'strikeouts_looking',

    // Results
    'win',
    'loss',
    'current_streak',
    'longest_win_streak',
    'longest_loss_streak',

    // Pitching
    'games_pitched',
    'pitched_outs',
    'batters_faced',
    'runs_allowed',
    'hits_allowed',
    'home_runs_allowed',
    'pitched_walks',
    'pitched_strikeouts',
    'pitched_strikeouts_swinging',
    'pitched_strikeouts_looking',
] as const satisfies readonly (keyof PlayerGameData)[];

// Rate stats. These are computed rather than stored as fields on PlayerGameData, so they
// are named here instead of in LEADERBOARD_STATS and resolved to a value in getLeaderboard.
const DERIVED_STATS = [
    'batting_average',
    'on_base_percentage',
    'slugging_percentage',
    'ops',
    'era',
    'whip',
] as const;

const ALL_LEADERBOARD_STATS = [...LEADERBOARD_STATS, ...DERIVED_STATS];

const DEFAULT_PRECISION = 3;
const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places;

export const getLeaderboard = tool(
    async ({ stat, precision, minAtBats, minPitchedOuts }) => {
        const { players, playerGameStats } = await loadLeagueData();

        const [statsById, playerIdsWithoutStats] = computeAllPlayerStatistics(
            playerGameStats, { batterIds: players }
        );

        const places = precision ?? DEFAULT_PRECISION;
        // No floor by default: everyone with at least one attempt is ranked. Callers that want
        // to exclude small samples pass a minimum explicitly.
        const atBatsFloor = minAtBats ?? 0;
        const pitchedOutsFloor = minPitchedOuts ?? 0;

        // Rate stats come from the numeric helpers in stats-core, so the leaderboard and the
        // player pages share one definition of each formula. Counting stats fall through to
        // the default and are read straight off the row.
        const valueOf = (s: PlayerGameData): number => {
            switch (stat) {
                case 'batting_average': return round(battingAverage(s), places);
                case 'on_base_percentage': return round(onBasePercentage(s), places);
                case 'slugging_percentage': return round(sluggingPercentage(s), places);
                case 'ops': return round(onBasePlusSlugging(s), places);
                case 'era': return round(era(s), places);
                case 'whip': return round(whip(s), places);
                default: return s[stat];
            }
        };

        // Counting stats have no minimum; everyone who played is ranked.
        const qualifies = (s: PlayerGameData): boolean => {
            switch (stat) {
                case 'batting_average':
                case 'slugging_percentage':
                case 'ops': return s.at_bats >= atBatsFloor;
                case 'on_base_percentage': return s.plate_appearances >= atBatsFloor;
                case 'era':
                case 'whip': return s.pitched_outs >= pitchedOutsFloor;
                default: return true;
            }
        };

        const ranked = players
            .filter(p => !playerIdsWithoutStats.has(p.id))
            .map(p => ({ name: playerName(p), stats: statsById.get(p.id)! }))
            .filter(e => qualifies(e.stats))
            .map(e => ({ name: e.name, value: valueOf(e.stats) }))
            // A zero denominator gives NaN or Infinity, which JSON.stringify turns into null.
            .filter(e => Number.isFinite(e.value))
            .sort((a, b) => b.value - a.value);

        if (ranked.length === 0) {
            return `No players qualify for the ${stat} leaderboard` +
                (atBatsFloor || pitchedOutsFloor
                    ? ` at the minimums requested (${atBatsFloor} at bats, ${pitchedOutsFloor} pitched outs). Try lowering them.`
                    : '.');
        }

        return JSON.stringify({
            stat,
            order: 'descending',
            // Only reported when a floor was actually applied, so the model can explain exclusions.
            ...(atBatsFloor || pitchedOutsFloor
                ? { qualifier: `minimum ${atBatsFloor} at bats, ${pitchedOutsFloor} pitched outs` }
                : {}),
            players: ranked,
        });
    },
    {
        name: 'get_leaderboard',
        description: `\
            Ranks every player in the league by one counting statistic across all official ruleset
            games, and returns the entire list sorted from highest value to lowest.
            Call this for any league-wide comparison: who leads, who has the most or fewest of
            something, or where one player stands relative to everyone else. For a single player's
            full stat line rather than their standing, use get_player_stats instead.
            The sort is always highest first. For stats where a lower number is better
            (runs_allowed, hits_allowed, home_runs_allowed, pitched_walks, loss, longest_loss_streak,
            strikeouts, strikeouts_swinging, strikeouts_looking) the best player is at the bottom of
            the list, so do not present the first entry as the leader for those.
            current_streak is signed: positive is an active win streak, negative an active loss streak.
            Rate stats are also available: batting_average, on_base_percentage, slugging_percentage,
            ops, era, and whip. Lower is better for era and whip, so their leaders are at the bottom
            too. Rate stats require a minimum number of attempts to qualify, so a player with very
            few at bats or innings pitched will not appear on those boards.
            Players who have never appeared in an official game are excluded from the results.
            Every qualifying player is returned, not just the top few, so you can call this tool
            several times and combine the results yourself. For a question like who leads in doubles
            plus triples, call it once for each stat and add the two values per player rather than
            saying it cannot be answered.`,
        schema: z.object({
            stat: z.enum(ALL_LEADERBOARD_STATS).describe('Which stat to rank by'),
            precision: z.number().int().min(0).max(6).optional()
                .describe('Decimal places for rate stats. Defaults to 3. Ignored for counting stats.'),
            minAtBats: z.number().int().min(0).optional()
                .describe(
                    'Minimum at bats (plate appearances for on_base_percentage) before a player ' +
                    'qualifies for a batting rate stat. No minimum by default. Set this to exclude ' +
                    'small samples, for example 10 to ignore players with only a handful of at bats.'
                ),
            minPitchedOuts: z.number().int().min(0).optional()
                .describe(
                    'Minimum pitched outs before a player qualifies for era or whip. No minimum by ' +
                    'default. Three outs is one inning, so 9 is a reasonable floor for a full game.'
                ),
        }),
    }
);

// Typed to the shared interface rather than the inferred union: a union of two
// generic tool signatures is not callable, so invoke() would not type-check.
export const allTools: StructuredToolInterface[] = [listPlayers, getPlayerStats, getLeaderboard];

// Name -> tool, for dispatching tool calls in the agent loop.
export const toolsByName: Record<string, StructuredToolInterface> =
    Object.fromEntries(allTools.map(t => [t.name, t]));
