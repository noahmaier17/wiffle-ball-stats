import { computeAtBatDeltas } from './computeAtBatDeltas';
import { defaultPlayerGameData, type Player, type PlayerGameData } from '../types';
import type { StatsAtBatLogRow } from '../contexts/StatsDataContext';

// Filter out flagged cached at-bat log rows (they are already flagged) and computes
// pitching stats for each batter against the given set of batters.
// Returns in the shape: [map of player_id to PlayerGameData (pitching stats only), set of player IDs with zero stats]

type ComputePitchersVersusBatterProps = {
    batters: Player[];
    pitchers: Player[];
    // When provided, only includes at-bat rows whose log_id is in this set (park filtering).
    // If undefined, all parks are included.
    logIds?: number[];
};

export function computePitchersVersusBatter(
    atBatLogs: StatsAtBatLogRow[],
    { batters, pitchers, logIds }: ComputePitchersVersusBatterProps
): [Map<number, PlayerGameData>, Set<number>] {
    if (batters.length === 0) return [new Map(), new Set()];

    const batterIdSet = new Set(batters.map(b => b.id));
    const pitcherIdSet = new Set(pitchers.map(p => p.id));
    const logIdSet = logIds ? new Set(logIds) : null;

    // Apply all filters at once: batter, pitcher, flagged pitcher row, and optional park.
    const filtered = atBatLogs.filter(r =>
        batterIdSet.has(r.batter_id) &&
        pitcherIdSet.has(r.pitcher_id) &&
        r.flagged_pitcher_row !== true &&
        (logIdSet === null || logIdSet.has(r.log_id))
    );

    // Group filtered rows by pitcher for aggregation
    const rowsByPitcher = new Map<number, StatsAtBatLogRow[]>();
    for (const row of filtered) {
        rowsByPitcher.has(row.pitcher_id)
            ? rowsByPitcher.get(row.pitcher_id)!.push(row)
            : rowsByPitcher.set(row.pitcher_id, [row]);
    }

    const pitcherIdToAllStats = new Map<number, PlayerGameData>();
    const pitcherIdsWithNoStats = new Set<number>();

    for (const pitcher of pitchers) {
        const rows = rowsByPitcher.get(pitcher.id);

        if (!rows || rows.length === 0) {
            pitcherIdToAllStats.set(pitcher.id, { ...defaultPlayerGameData, player_id: pitcher.id });
            pitcherIdsWithNoStats.add(pitcher.id);
            continue;
        }

        // Accumulate pitching deltas from computeAtBatDeltas for each at-bat
        const accumulated: Record<string, number> = {};
        for (const row of rows) {
            const { pitcherDelta } = computeAtBatDeltas(row.outcome_sign, row.rbis, row.recorded_outs);
            for (const [key, val] of Object.entries(pitcherDelta)) {
                accumulated[key] = (accumulated[key] ?? 0) + val;
            }
        }

        const pitched_outs = accumulated.pitched_outs ?? 0;

        pitcherIdToAllStats.set(pitcher.id, {
            ...defaultPlayerGameData,
            player_id: pitcher.id,
            pitched_outs,
            // innings_pitched decimal: tenths digit = extra outs (e.g. 1.2 = 1 inning + 2 outs)
            innings_pitched: Math.floor(pitched_outs / 3) + (pitched_outs % 3) / 10,
            pitched_strikeouts: accumulated.pitched_strikeouts ?? 0,
            pitched_strikeouts_swinging: accumulated.pitched_strikeouts_swinging ?? 0,
            pitched_strikeouts_looking: accumulated.pitched_strikeouts_looking ?? 0,
            pitched_walks: accumulated.pitched_walks ?? 0,
            hits_allowed: accumulated.hits_allowed ?? 0,
            home_runs_allowed: accumulated.home_runs_allowed ?? 0,
            batters_faced: rows.length,
        });
    }

    return [pitcherIdToAllStats, pitcherIdsWithNoStats];
}
