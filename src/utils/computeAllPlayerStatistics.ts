import { defaultPlayerGameData, type Player, type PlayerGameData } from '../stats-core.js';
import { calculateStreaks } from './calculateStreaks.js';

// Fetches player statistics. 
// Returns in the shape: [map of player_id to aggregated PlayerGameData, set of player IDs with zero stats]

type ComputeAllPlayerStatisticsProps = {
    batterIds: Player[];
    // When provided, only includes rows for these game IDs (used for park and fielder count filtering).
    // If undefined, all games are included.
    gameIds?: number[];
};

export function computeAllPlayerStatistics(
    playerGameStats: PlayerGameData[],
    { batterIds, gameIds }: ComputeAllPlayerStatisticsProps
): [Map<number, PlayerGameData>, Set<number>] {

    // Narrow to the relevant games if a park filter is active
    const rows = gameIds !== undefined
        ? playerGameStats.filter(r => gameIds.includes(r.game_id))
        : playerGameStats;

    // Group all per-game rows by player
    const playerIdToDatabaseEntries = new Map<number, PlayerGameData[]>();
    for (const row of rows) {
        playerIdToDatabaseEntries.has(row.player_id)
            ? playerIdToDatabaseEntries.set(row.player_id, [...playerIdToDatabaseEntries.get(row.player_id)!, row])
            : playerIdToDatabaseEntries.set(row.player_id, [row]);
    }

    // Aggregate each player's per-game rows into a single career-total row
    const playerIdToAllStats = new Map<number, PlayerGameData>();

    for (const [playerId, entries] of playerIdToDatabaseEntries.entries()) {
        const sum = (key: keyof PlayerGameData) =>
            entries.reduce((acc, curr) => acc + (curr[key] as number), 0);

        const pitched_outs = sum('pitched_outs');
        const streaks = calculateStreaks(entries);

        // innings_pitched is stored as a decimal where the tenths digit = extra outs
        // (e.g. 1.2 means 1 full inning + 2 outs, NOT 1.2 innings)
        playerIdToAllStats.set(playerId, {
            id: -1,
            player_id: playerId,
            game_id: -1,
            plate_appearances: sum('plate_appearances'),
            at_bats: sum('at_bats'),
            games_played: sum('games_played'),
            hits: sum('hits'),
            singles: sum('singles'),
            doubles: sum('doubles'),
            triples: sum('triples'),
            home_runs: sum('home_runs'),
            inside_the_park_home_runs: sum('inside_the_park_home_runs'),
            runs_batted_in: sum('runs_batted_in'),
            walks: sum('walks'),
            fielders_choice: sum('fielders_choice'),
            strikeouts_swinging: sum('strikeouts_swinging'),
            strikeouts_looking: sum('strikeouts_looking'),
            strikeouts: sum('strikeouts'),
            pitched_outs,
            innings_pitched: Math.floor(pitched_outs / 3) + (pitched_outs % 3) / 10,
            pitched_strikeouts_swinging: sum('pitched_strikeouts_swinging'),
            pitched_strikeouts_looking: sum('pitched_strikeouts_looking'),
            pitched_strikeouts: sum('pitched_strikeouts'),
            pitched_walks: sum('pitched_walks'),
            hits_allowed: sum('hits_allowed'),
            home_runs_allowed: sum('home_runs_allowed'),
            runs_allowed: sum('runs_allowed'),
            games_pitched: sum('games_pitched'),
            win: sum('win'),
            loss: sum('loss'),
            current_streak: streaks.current_streak,
            longest_win_streak: streaks.longest_win_streak,
            longest_loss_streak: streaks.longest_loss_streak,
            batters_faced: sum('batters_faced'),
        });
    }

    // Players with no rows in the filtered set get zeroed-out defaults
    const playerIdsWithNoStats = new Set<number>();

    for (const batter of batterIds) {
        if (!playerIdToAllStats.has(batter.id)) {
            playerIdToAllStats.set(batter.id, {
                ...defaultPlayerGameData,
                player_id: batter.id,
            });
            playerIdsWithNoStats.add(batter.id);
        }
    }

    return [playerIdToAllStats, playerIdsWithNoStats];
}
