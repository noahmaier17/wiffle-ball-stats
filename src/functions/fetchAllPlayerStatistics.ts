import { supabase } from "../supabase-client";
import { type PlayerGameData } from "../types";

async function fetchAllPlayerStatistics() {

    // Fetches our data from supabase
    const { data, error } = await supabase
        .from('player_game_stats')
        .select('*');
    const playerGameData = data as PlayerGameData[]; // Type change

    if (error) {
        console.log(error.message);
        return null;
    }

    // Hashes all player ids to their database schemas
    const playerIdToDatabaseEntries = new Map<number, PlayerGameData[]>();
    for (const row of playerGameData) {
        playerIdToDatabaseEntries.has(row.player_id)
            ? playerIdToDatabaseEntries.set(row.player_id, [...playerIdToDatabaseEntries.get(row.player_id)!, row])
            : playerIdToDatabaseEntries.set(row.player_id, [row]) 
    }

    // For every player, populates an aggregated `PlayerDatabaseSchema` for them
    const playerIdToAllStats = new Map<number, PlayerGameData>();
    for (const [playerId, entries] of playerIdToDatabaseEntries.entries()) {
        const sum = (key: keyof PlayerGameData) =>
            entries.reduce((acc, curr) => acc + (curr[key] as number), 0);

        const pitched_outs = sum('pitched_outs');

        playerIdToAllStats.set(playerId, {
            id: -1,                 // Does not matter for these aggregated stats
            player_id: playerId,
            game_id: -1,            // Does not matter for these aggregated stats
            plate_appearances: sum('plate_appearances'),
            at_bats: sum('at_bats'),
            hits: sum('hits'),
            singles: sum('singles'),
            doubles: sum('doubles'),
            triples: sum('triples'),
            home_runs: sum('home_runs'),
            inside_the_park_home_runs: sum('inside_the_park_home_runs'),
            runs_batted_in: sum('runs_batted_in'),
            walks: sum('walks'),
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
            runs_allowed: sum('runs_allowed')
        })
    }
    
    return playerIdToAllStats;
}

export default fetchAllPlayerStatistics