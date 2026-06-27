import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase-client';
import type { PlayerGameData } from '../types';

// Raw row shapes returned by Supabase for each table we cache.
// Only the columns we need for stats are selected.
export type StatsAtBatLogRow = {
    log_id: number;      // Foreign key to game_logs.id
    batter_id: number;
    pitcher_id: number;
    outcome_sign: string;
    rbis: number;
    recorded_outs: number;
    // Null and false both mean "not flagged". Each flag is checked independently:
    // flagged_batter_row is filtered in computeBattersVersusPitcher,
    // flagged_pitcher_row is filtered in computePitchersVersusBatter.
    flagged_batter_row: boolean | null;
    flagged_pitcher_row: boolean | null;
    extra_comments: string;
};

// Minimal game row. Only columns we need for stats are selected.
export type StatsGameRow = {
    id: number;
    field: string;
    number_of_fielders: number;
    date: string;          // YYYY-MM-DD
    home_score: number;
    away_score: number;
};

// Minimal game_log row. Only columns we need for stats are selected.
export type StatsGameLogRow = {
    id: number;
    game_id: number;
};

type StatsDataContextType = {
    playerGameStats: PlayerGameData[];   // All rows from player_game_stats (one row per player per game)
    atBatLogs: StatsAtBatLogRow[];       // All at-bat logs (flag filtering applied per compute function)
    games: StatsGameRow[];               // All games (id + field)
    gameLogs: StatsGameLogRow[];         // All game log entries (id + game_id)
    isLoading: boolean;                  // True until the first fetch completes
    lastUpdated: Date | null;            // Timestamp of last successful fetch
    refresh: () => void;                 // Call this to force an immediate re-fetch
};

const StatsDataContext = createContext<StatsDataContextType>({
    playerGameStats: [],
    atBatLogs: [],
    games: [],
    gameLogs: [],
    isLoading: true,
    lastUpdated: null,
    refresh: () => {},
});

// Refresh interval.
const REFRESH_INTERVAL_MS = 10_000;

const PAGE_SIZE = 1000;

async function fetchAllPages<T>(
    buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[] | null> {
    const results: T[] = [];
    let from = 0;
    while (true) {
        const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
        if (error || !data) return null;
        results.push(...data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
    }
    return results;
}

export function StatsDataProvider({ children }: { children: React.ReactNode }) {
    const [playerGameStats, setPlayerGameStats] = useState<PlayerGameData[]>([]);
    const [atBatLogs, setAtBatLogs] = useState<StatsAtBatLogRow[]>([]);
    const [games, setGames] = useState<StatsGameRow[]>([]);
    const [gameLogs, setGameLogs] = useState<StatsGameLogRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Fires all 4 queries in parallel, paginating through any that exceed 1000 rows.
    const fetchAll = async () => {
        const [statsData, atBatData, gamesData, gameLogsData] = await Promise.all([
            fetchAllPages<PlayerGameData>((from, to) =>
                supabase.from('player_game_stats').select('*').range(from, to)
            ),
            fetchAllPages<StatsAtBatLogRow>((from, to) =>
                supabase
                    .from('at_bat_logs')
                    .select('log_id, batter_id, pitcher_id, outcome_sign, rbis, recorded_outs, flagged_batter_row, flagged_pitcher_row, extra_comments')
                    .range(from, to)
            ),
            fetchAllPages<StatsGameRow>((from, to) =>
                supabase.from('games').select('id, field, number_of_fielders, date, home_score, away_score').range(from, to)
            ),
            fetchAllPages<StatsGameLogRow>((from, to) =>
                supabase.from('game_logs').select('id, game_id').range(from, to)
            ),
        ]);

        // Only update state for tables that succeeded; leave stale data in place on error
        if (statsData) setPlayerGameStats(statsData);
        if (atBatData) setAtBatLogs(atBatData);
        if (gamesData) setGames(gamesData);
        if (gameLogsData) setGameLogs(gameLogsData);

        setIsLoading(false);
        setLastUpdated(new Date());
    };

    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, REFRESH_INTERVAL_MS);
        return () => clearInterval(interval);
    }, []);

    return (
        <StatsDataContext.Provider value={{
            playerGameStats,
            atBatLogs,
            games,
            gameLogs,
            isLoading,
            lastUpdated,
            refresh: fetchAll,
        }}>
            {children}
        </StatsDataContext.Provider>
    );
}

export const useStatsData = () => useContext(StatsDataContext);
