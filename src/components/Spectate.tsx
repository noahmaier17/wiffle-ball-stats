import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase-client';
import type { GameData, GameLogEntry, Player } from '../types';
import { rowToLogEntry, makeFindPlayer } from '../types';
import { buildGameDataFromRow } from '../utils/buildGameDataFromRow';
import Jumbotron from './Jumbotron';
import GameLog from './GameLog';

type SpectateProps = {
    gameId: number;
    onBack: () => void;
};

const playPing = () => {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
};

function Spectate({ gameId, onBack }: SpectateProps) {
    const [gameData, setGameData] = useState<GameData | null>(null);
    const [log, setLog] = useState<GameLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const playersRef = useRef<Player[]>([]);
    const prevLogLengthRef = useRef(0);

    useEffect(() => {
        if (log.length > prevLogLengthRef.current && prevLogLengthRef.current > 0) {
            playPing();
        }
        prevLogLengthRef.current = log.length;
    }, [log]);

    const LOG_SELECT = `
        id, sequence, type,
        at_bat_logs(batter_id, pitcher_id, outcome_sign, rbis, recorded_outs, inning, extra_comments),
        pitching_change_logs(team_changing, old_pitcher_id, new_pitcher_id),
        additional_information_logs(info, type_of_info),
        edit_gamestate_logs(info, new_game_data),
        inning_switch_logs(log_id)
    `;

    const buildLog = (rows: any[]): GameLogEntry[] => {
        const findPlayer = makeFindPlayer(playersRef.current);
        return rows.map(row => rowToLogEntry(row, findPlayer));
    };

    const fetchGame = async () => {
        const [{ data: gameRow, error: gameError }, { data: logRows }] = await Promise.all([
            supabase.from('games').select('*').eq('id', gameId).single(),
            supabase.from('game_logs').select(LOG_SELECT).eq('game_id', gameId).order('sequence'),
        ]);

        if (gameError || !gameRow) return;

        const gd = buildGameDataFromRow(gameRow, playersRef.current);
        if (gd) setGameData(gd);
        if (logRows?.length) setLog(buildLog(logRows));
    };

    useEffect(() => {
        const load = async () => {
            const [{ data: playersData }, { data: gameRow, error: gameError }, { data: logRows }] = await Promise.all([
                supabase.from('players').select('id, first_name, last_name'),
                supabase.from('games').select('*').eq('id', gameId).single(),
                supabase.from('game_logs').select(LOG_SELECT).eq('game_id', gameId).order('sequence'),
            ]);

            if (gameError || !gameRow || !playersData) {
                setError('Could not load game.');
                setLoading(false);
                return;
            }

            playersRef.current = playersData.map((p: any) => ({
                id: p.id,
                firstName: p.first_name,
                lastName: p.last_name,
            }));

            const gd = buildGameDataFromRow(gameRow, playersRef.current);
            if (!gd) {
                setError('Game data is incomplete.');
                setLoading(false);
                return;
            }

            setGameData(gd);
            if (logRows?.length) setLog(buildLog(logRows));
            setLoading(false);
        };

        load();

        const channel = supabase
            .channel(`game-${gameId}`)
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
                () => fetchGame()
            )
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'game_logs', filter: `game_id=eq.${gameId}` },
                () => fetchGame()
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [gameId]);

    if (loading) return <div style={{ padding: '2rem' }}>Loading game...</div>;
    if (error || !gameData) return (
        <div style={{ padding: '2rem' }}>
            <p style={{ color: '#fca5a5' }}>{error || 'Failed to load game.'}</p>
            <button onClick={onBack} style={{ padding: '8px 16px', backgroundColor: '#4b5563', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                ← Back
            </button>
        </div>
    );

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1rem' }}>
                <button
                    onClick={onBack}
                    style={{ padding: '8px 16px', backgroundColor: '#4b5563', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    ← Back
                </button>
                {gameData.isGameOver && (
                    <span style={{ backgroundColor: '#374151', color: '#9ca3af', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem' }}>
                        FINAL
                    </span>
                )}
                {!gameData.isGameOver && (
                    <span style={{ backgroundColor: '#166534', color: '#86efac', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem' }}>
                        LIVE
                    </span>
                )}
            </div>

            <Jumbotron gameData={gameData} />
            <hr />
            <GameLog log={log} />
        </div>
    );
}

export default Spectate;
