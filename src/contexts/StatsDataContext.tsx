import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase-client';
import type { PlayerGameData } from '../types';

// Raw row shapes returned by Supabase for each table we cache.
// Only the columns we need for stats are selected.
export type StatsAtBatLogRow = {
    log_id: number;      // Foreign key to game_logs.id, used to resolve park filters
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

export function StatsDataProvider({ children }: { children: React.ReactNode }) {
    const [playerGameStats, setPlayerGameStats] = useState<PlayerGameData[]>([]);
    const [atBatLogs, setAtBatLogs] = useState<StatsAtBatLogRow[]>([]);
    const [games, setGames] = useState<StatsGameRow[]>([]);
    const [gameLogs, setGameLogs] = useState<StatsGameLogRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Fires all 4 queries in parallel.
    const fetchAll = async () => {
        const [statsRes, atBatRes, gamesRes, gameLogsRes] = await Promise.all([
            supabase.from('player_game_stats').select('*'),
            // Fetch all at-bat rows including flag columns.
            supabase
                .from('at_bat_logs')
                .select('log_id, batter_id, pitcher_id, outcome_sign, rbis, recorded_outs, flagged_batter_row, flagged_pitcher_row, extra_comments'),
            supabase.from('games').select('id, field, number_of_fielders, date, home_score, away_score'),
            supabase.from('game_logs').select('id, game_id'),
        ]);

        // Only update state for tables that succeeded; leave stale data in place on error
        if (!statsRes.error && statsRes.data) setPlayerGameStats(statsRes.data as PlayerGameData[]);
        if (!atBatRes.error && atBatRes.data) setAtBatLogs(atBatRes.data as StatsAtBatLogRow[]);
        if (!gamesRes.error && gamesRes.data) setGames(gamesRes.data as StatsGameRow[]);
        if (!gameLogsRes.error && gameLogsRes.data) setGameLogs(gameLogsRes.data as StatsGameLogRow[]);

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
