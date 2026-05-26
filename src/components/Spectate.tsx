import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase-client';
import type { GameData, GameLogEntry } from '../types';
import { fetchGame } from '../utils/fetchGame';
import { usePlayers } from '../contexts/PlayersContext';
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
    const players = usePlayers();
    const [gameData, setGameData] = useState<GameData | null>(null);
    const [log, setLog] = useState<GameLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const playersRef = useRef(players);
    const prevLogLengthRef = useRef(0);

    useEffect(() => {
        if (log.length > prevLogLengthRef.current && prevLogLengthRef.current > 0) {
            playPing();
        }
        prevLogLengthRef.current = log.length;
    }, [log]);

    const refresh = async () => {
        const result = await fetchGame(gameId, playersRef.current);
        if (!result) return;
        setGameData(result.gameData);
        setLog(result.log);
    };

    useEffect(() => {
        const load = async () => {
            const result = await fetchGame(gameId, playersRef.current);
            if (!result) {
                setError('Could not load game.');
                setLoading(false);
                return;
            }
            setGameData(result.gameData);
            setLog(result.log);
            setLoading(false);
        };

        load();

        const channel = supabase
            .channel(`game-${gameId}`)
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
                () => refresh()
            )
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'game_logs', filter: `game_id=eq.${gameId}` },
                () => refresh()
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
