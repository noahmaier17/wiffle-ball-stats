import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase-client';
import type { GameData, GameLogEntry, Player } from '../types';
import Jumbotron from './Jumbotron';
import GameLog from './GameLog';

type SpectateProps = {
    gameId: number;
    onBack: () => void;
};

function buildGameData(game: any, players: Player[]): GameData | null {
    const findPlayer = (id: number) => players.find(p => p.id === id);
    const awayLineup = (game.away_team_lineup_ids || []).map((id: number) => findPlayer(id)).filter(Boolean) as Player[];
    const homeLineup = (game.home_team_lineup_ids || []).map((id: number) => findPlayer(id)).filter(Boolean) as Player[];
    const awayPitcher = findPlayer(game.away_pitcher_id);
    const homePitcher = findPlayer(game.home_pitcher_id);

    if (!awayPitcher || !homePitcher || awayLineup.length === 0 || homeLineup.length === 0) return null;

    return {
        gameId: game.id,
        awayTeamLineup: awayLineup,
        homeTeamLineup: homeLineup,
        awayPitcher,
        homePitcher,
        awayTeamBatting: game.away_team_is_batting ?? true,
        inning: game.inning ?? 1,
        numberOfOuts: game.number_of_outs ?? 0,
        awayRuns: game.away_score ?? 0,
        homeRuns: game.home_score ?? 0,
        currAwayTeamBatter: game.current_away_team_batter_index ?? 0,
        currHomeTeamBatter: game.current_home_team_batter_index ?? 0,
        isGameOver: game.game_over ?? false,
    };
}

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

    const fetchGame = async () => {
        const { data: gameRow, error: gameError } = await supabase
            .from('games')
            .select('*')
            .eq('id', gameId)
            .single();

        if (gameError || !gameRow) return;

        const gd = buildGameData(gameRow, playersRef.current);
        if (gd) setGameData(gd);
        if (gameRow.logs?.length) setLog(gameRow.logs);
    };

    useEffect(() => {
        const load = async () => {
            const [{ data: playersData }, { data: gameRow, error: gameError }] = await Promise.all([
                supabase.from('players').select('id, first_name, last_name'),
                supabase.from('games').select('*').eq('id', gameId).single(),
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

            const gd = buildGameData(gameRow, playersRef.current);
            if (!gd) {
                setError('Game data is incomplete.');
                setLoading(false);
                return;
            }

            setGameData(gd);
            if (gameRow.logs?.length) setLog(gameRow.logs);
            setLoading(false);
        };

        load();

        const interval = setInterval(fetchGame, 5000);
        return () => clearInterval(interval);
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
