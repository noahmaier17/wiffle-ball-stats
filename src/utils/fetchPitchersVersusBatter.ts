import { supabase } from "../supabase-client";
import { computeAtBatDeltas } from "./computeAtBatDeltas";
import { defaultPlayerGameData, type Park, type Player, type PlayerGameData } from "../types";
import fetchGameIdsByPark from "./fetchGameIdsByPark";

type FetchPitchersVersusBatterProps = {
    batters: Player[];
    pitchers: Player[];
    selectedParks?: Set<Park>;
}

async function fetchPitchersVersusBatter(
    { batters, pitchers, selectedParks }: FetchPitchersVersusBatterProps
): Promise<[Map<number, PlayerGameData>, Set<number>] | null> {
    if (batters.length === 0) return [new Map(), new Set()];

    let query = supabase
        .from('at_bat_logs')
        .select('pitcher_id, outcome_sign, rbis, recorded_outs')
        .in('batter_id', batters.map(b => b.id))
        .in('pitcher_id', pitchers.map(p => p.id))
        .not('flagged_batter_row', 'is', true)
        .not('flagged_pitcher_row', 'is', true);

    if (selectedParks) {
        // Resolves selected parks to game IDs
        const gameIds = await fetchGameIdsByPark(selectedParks);
        if (gameIds === null) return null;
        if (gameIds.length === 0) return [new Map(), new Set()];

        // Resolves game IDs to at_bat_logs log IDs
        const { data: logRows, error: logError } = await supabase
            .from('game_logs')
            .select('id')
            .in('game_id', gameIds);
        if (logError) return null;

        const logIds = logRows.map(r => r.id);
        if (logIds.length === 0) return [new Map(), new Set()];

        query = query.in('log_id', logIds);
    }

    const { data, error } = await query;

    if (error) {
        console.log(error.message);
        return null;
    }

    const rowsByPitcher = new Map<number, typeof data>();
    for (const row of data) {
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

export default fetchPitchersVersusBatter;
