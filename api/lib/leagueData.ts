import { getSupabase } from './supabase.js';
import { OFFICIAL_FIELDER_COUNTS, OFFICIAL_PARKS } from '../../src/constants.js';
import type { Player, PlayerGameData } from '../../src/stats-core.js';

// Minimal game row; only the columns the tools need.
export type LeagueGameRow = {
    id: number;
    field: string;
    number_of_fielders: number;
    date: string;          // YYYY-MM-DD
    home_score: number;
    away_score: number;
};

export type LeagueData = {
    players: Player[];
    games: LeagueGameRow[];              // official ruleset games only
    playerGameStats: PlayerGameData[];   // rows belonging to those games only
};

// Supabase caps rows per request, so every table has to be paged through.
const PAGE_SIZE = 1000;

async function fetchAllPages<T>(
    buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
    const results: T[] = [];
    let from = 0;
    while (true) {
        const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        if (!data) break;
        results.push(...data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
    }
    return results;
}

// Vercel reuses warm containers between requests, so this cache survives across
// invocations. A single chat turn can fire several tool calls; they all share one fetch.
const CACHE_TTL_MS = 60_000;
let cache: { data: LeagueData; fetchedAt: number } | null = null;
let inFlight: Promise<LeagueData> | null = null;

const OFFICIAL_PARK_SET = new Set<string>(OFFICIAL_PARKS);
const OFFICIAL_FIELDER_COUNT_SET = new Set<number>(OFFICIAL_FIELDER_COUNTS);

async function fetchLeagueData(): Promise<LeagueData> {
    const supabase = getSupabase();

    const [playerRows, gameRows, statRows] = await Promise.all([
        fetchAllPages<{ id: number; first_name: string; last_name: string }>((from, to) =>
            supabase.from('players').select('id, first_name, last_name').range(from, to)
        ),
        fetchAllPages<LeagueGameRow>((from, to) =>
            supabase.from('games').select('id, field, number_of_fielders, date, home_score, away_score').range(from, to)
        ),
        fetchAllPages<PlayerGameData>((from, to) =>
            supabase.from('player_game_stats').select('*').range(from, to)
        ),
    ]);

    // Filter to the official ruleset here so every tool agrees with what the
    // rest of the app displays by default.
    const games = gameRows.filter(g =>
        OFFICIAL_PARK_SET.has(g.field) && OFFICIAL_FIELDER_COUNT_SET.has(g.number_of_fielders)
    );
    const officialGameIds = new Set(games.map(g => g.id));

    return {
        players: playerRows.map(p => ({ id: p.id, firstName: p.first_name, lastName: p.last_name })),
        games,
        playerGameStats: statRows.filter(r => officialGameIds.has(r.game_id)),
    };
}

export async function loadLeagueData(): Promise<LeagueData> {
    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.data;

    // Collapse concurrent misses into one fetch rather than stampeding Supabase.
    if (!inFlight) {
        inFlight = fetchLeagueData()
            .then(data => {
                cache = { data, fetchedAt: Date.now() };
                return data;
            })
            .finally(() => { inFlight = null; });
    }
    return inFlight;
}
