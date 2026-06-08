import { defaultPlayerGameData, type Player, type PlayerGameData } from '../types';
import type { StatsAtBatLogRow } from '../contexts/StatsDataContext';

// Filter out flagged cached at-bat log rows (they are already flagged) and computes
// batting stats for each batter against the given set of pitchers.
// Returns in the shape: [map of player_id to PlayerGameData (batting stats only), set of player IDs with zero stats]

type ComputeBattersVersusPitcherProps = {
    batters: Player[];
    pitchers: Player[];
    // When provided, only includes at-bat rows whose log_id is in this set (park filtering).
    // If undefined, all parks are included.
    logIds?: number[];
};

export function computeBattersVersusPitcher(
    atBatLogs: StatsAtBatLogRow[],
    { batters, pitchers, logIds }: ComputeBattersVersusPitcherProps
): [Map<number, PlayerGameData>, Set<number>] {
    if (pitchers.length === 0) return [new Map(), new Set()];

    const batterIdSet = new Set(batters.map(b => b.id));
    const pitcherIdSet = new Set(pitchers.map(p => p.id));
    const logIdSet = logIds ? new Set(logIds) : null;

    // Apply all filters at once: batter, pitcher, flagged batter row, and optional park.
    const filtered = atBatLogs.filter(r =>
        batterIdSet.has(r.batter_id) &&
        pitcherIdSet.has(r.pitcher_id) &&
        r.flagged_batter_row !== true &&
        (logIdSet === null || logIdSet.has(r.log_id))
    );

    // Group filtered rows by batter for aggregation
    const rowsByBatter = new Map<number, StatsAtBatLogRow[]>();
    for (const row of filtered) {
        rowsByBatter.has(row.batter_id)
            ? rowsByBatter.get(row.batter_id)!.push(row)
            : rowsByBatter.set(row.batter_id, [row]);
    }

    const playerIdToAllStats = new Map<number, PlayerGameData>();
    const playerIdsWithNoStats = new Set<number>();

    for (const batter of batters) {
        const rows = rowsByBatter.get(batter.id);

        if (!rows || rows.length === 0) {
            playerIdToAllStats.set(batter.id, { ...defaultPlayerGameData, player_id: batter.id });
            playerIdsWithNoStats.add(batter.id);
            continue;
        }

        // Count each outcome type from the raw outcome_sign strings
        const singles = rows.filter(r => r.outcome_sign === '1B').length;
        const doubles = rows.filter(r => r.outcome_sign === '2B').length;
        const triples = rows.filter(r => r.outcome_sign === '3B').length;
        const home_runs = rows.filter(r => r.outcome_sign === 'HR').length;
        const inside_the_park_home_runs = rows.filter(r => r.outcome_sign === 'IPHR').length;
        const hits = singles + doubles + triples + home_runs + inside_the_park_home_runs;
        const walks = rows.filter(r => r.outcome_sign === 'BB').length;
        const strikeouts_swinging = rows.filter(r => r.outcome_sign === 'K').length;
        const strikeouts_looking = rows.filter(r => r.outcome_sign === 'reverse-K').length;
        const fielders_choice = rows.filter(r => r.outcome_sign === 'FC').length;
        const runs_batted_in = rows.reduce((acc, r) => acc + r.rbis, 0);
        const plate_appearances = rows.length;
        // Walks don't count as at-bats
        const at_bats = plate_appearances - walks;

        playerIdToAllStats.set(batter.id, {
            ...defaultPlayerGameData,
            player_id: batter.id,
            plate_appearances,
            at_bats,
            hits,
            singles,
            doubles,
            triples,
            home_runs,
            inside_the_park_home_runs,
            walks,
            strikeouts: strikeouts_swinging + strikeouts_looking,
            strikeouts_swinging,
            strikeouts_looking,
            runs_batted_in,
            fielders_choice,
        });
    }

    return [playerIdToAllStats, playerIdsWithNoStats];
}
