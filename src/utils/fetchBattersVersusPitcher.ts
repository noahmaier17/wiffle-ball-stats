import { supabase } from "../supabase-client";
import { defaultPlayerGameData, type Park, type Player, type PlayerGameData } from "../types";
import fetchGameIdsByPark from "./fetchGameIdsByPark";

type FetchBatterVersusPitcherProps = {
    batters: Player[];
    pitchers: Player[];
    selectedParks?: Set<Park>;
}

async function fetchBattersVersusPitcher(
    { batters, pitchers, selectedParks }: FetchBatterVersusPitcherProps
): Promise<[Map<number, PlayerGameData>, Set<number>] | null> {
    if (pitchers.length === 0) return [new Map(), new Set()];

    let query = supabase
        .from('at_bat_logs')
        .select('batter_id, outcome_sign, rbis')
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

    const rowsByBatter = new Map<number, typeof data>();
    for (const row of data) {
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

export default fetchBattersVersusPitcher;
