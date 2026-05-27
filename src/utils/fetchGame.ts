import { supabase } from '../supabase-client';
import type { AtBatLog, AtBatOutcomeSign, GameData, GameLogEntry, Player } from '../types';
import { rowToLogEntry, makeFindPlayer } from '../types';
import { buildGameDataFromRow } from './buildGameDataFromRow';

export const LOG_SELECT = `
    id, sequence, type,
    at_bat_logs(batter_id, pitcher_id, outcome_sign, rbis, recorded_outs, inning, extra_comments),
    pitching_change_logs(team_changing, old_pitcher_id, new_pitcher_id),
    additional_information_logs(info, type_of_info),
    edit_gamestate_logs(info, new_game_data),
    inning_switch_logs(log_id)
`;

export async function fetchMaxGameLogSequence(gameId: number): Promise<number> {
    const { data } = await supabase
        .from('game_logs')
        .select('sequence')
        .eq('game_id', gameId)
        .order('sequence', { ascending: false })
        .limit(1)
        .maybeSingle();
    return data ? data.sequence + 1 : 0;
}

export async function fetchGameLogs(
    gameId: number, 
    players: Player[]
): Promise<GameLogEntry[]> {
    const { data: logRows } = await supabase
        .from('game_logs')
        .select(LOG_SELECT)
        .eq('game_id', gameId)
        .order('sequence');

    const findPlayer = makeFindPlayer(players);
    const entries: GameLogEntry[] = [];
    let expectedSeq = 0;

    for (const row of (logRows ?? [])) {
        for (let missing = expectedSeq; missing < row.sequence; missing++) {
            entries.push({ type: 'additional_information', info: `Missing log (seq: ${missing})`, typeOfInfo: 'gamestate_reply_issue' });
        }
        entries.push(rowToLogEntry(row, findPlayer));
        expectedSeq = row.sequence + 1;
    }

    return entries;
}

export type PlayerAtBat = AtBatLog & { gameId: number };

export async function fetchPlayerBatterLogs(
    playerId: number,
    players: Player[],
    options: { dropFlaggedBatterLogs?: boolean } = {}
): Promise<PlayerAtBat[]> {
    let query = supabase
        .from('at_bat_logs')
        .select('batter_id, pitcher_id, outcome_sign, rbis, recorded_outs, extra_comments, game_logs(id, game_id, sequence)')
        .eq('batter_id', playerId)
        .order('log_id');

    if (options.dropFlaggedBatterLogs) {
        query = query.not('flagged_batter_row', 'is', true);
    }

    const { data: rows } = await query;

    const findPlayer = makeFindPlayer(players);
    return (rows ?? []).map((row: any) => ({
        type: 'atbat' as const,
        logId: row.game_logs.id,
        batter: findPlayer(row.batter_id),
        pitcher: findPlayer(row.pitcher_id),
        rbis: row.rbis,
        recordedOuts: row.recorded_outs,
        outcomeSign: row.outcome_sign as AtBatOutcomeSign,
        extraComments: row.extra_comments ?? '',
        gameId: row.game_logs.game_id,
    }));
}

export async function fetchPlayerPitcherLogs(
    playerId: number,
    players: Player[],
    options: { dropFlaggedPitcherLogs?: boolean } = {}
): Promise<PlayerAtBat[]> {
    let query = supabase
        .from('at_bat_logs')
        .select('batter_id, pitcher_id, outcome_sign, rbis, recorded_outs, extra_comments, game_logs(id, game_id, sequence)')
        .eq('pitcher_id', playerId)
        .order('log_id');

    if (options.dropFlaggedPitcherLogs) {
        query = query.not('flagged_pitcher_row', 'is', true);
    }

    const { data: rows } = await query;

    const findPlayer = makeFindPlayer(players);
    return (rows ?? []).map((row: any) => ({
        type: 'atbat' as const,
        logId: row.game_logs.id,
        batter: findPlayer(row.batter_id),
        pitcher: findPlayer(row.pitcher_id),
        rbis: row.rbis,
        recordedOuts: row.recorded_outs,
        outcomeSign: row.outcome_sign as AtBatOutcomeSign,
        extraComments: row.extra_comments ?? '',
        gameId: row.game_logs.game_id,
    }));
}

export type GameRow = {
    id: number;
    date: string | null;
    home_score: number;
    away_score: number;
    game_over: boolean;
};

export async function fetchGamesByIds(ids: number[]): Promise<GameRow[]> {
    if (ids.length === 0) return [];
    const { data } = await supabase
        .from('games')
        .select('id, date, home_score, away_score, game_over')
        .in('id', ids);
    return data ?? [];
}

export async function fetchGame(
    gameId: number,
    players: Player[]
): Promise<{ gameData: GameData; log: GameLogEntry[] } | null> {
    const [{ data: gameRow, error: gameError }, log] = await Promise.all([
        supabase.from('games').select('*').eq('id', gameId).single(),
        fetchGameLogs(gameId, players),
    ]);

    if (gameError || !gameRow) return null;

    const gameData = buildGameDataFromRow(gameRow, players);
    if (!gameData) return null;

    return { gameData, log };
}
