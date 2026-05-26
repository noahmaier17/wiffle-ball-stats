import { useEffect, useState } from "react";
import './App.css';
import Home from './components/Home.tsx';
import GameLogger from './components/GameLogger.tsx';
import Spectate from './components/Spectate.tsx';
import PlayerStatisticsSelection from './components/statistics/PlayerStatisticsSelection.tsx';
import type { GameData, Player } from './types';
import { supabase } from "./supabase-client.ts";
import PlayersContext from './contexts/PlayersContext.tsx';
import { buildGameDataFromRow } from './utils/buildGameDataFromRow.ts';
import type { Session } from '@supabase/supabase-js';

function App() {

    const [gameState, setGameState] = useState<GameData | null>(null);
    const [spectateGameId, setSpectateGameId] = useState<number | null>(() => {
        const m = window.location.hash.match(/^#spectate\/(\d+)$/);
        return m ? parseInt(m[1]) : null;
    });
    const [showStatistics, setShowStatistics] = useState(
        () => window.location.hash === '#statistics'
    );
    const [players, setPlayers] = useState<Player[]>([]);
    const [playersLoading, setPlayersLoading] = useState(true);
    const [session, setSession] = useState<Session | null>(null);
    const [sessionLoading, setSessionLoading] = useState(true);

    // Game ID from the URL hash at page load — read-only after mount
    const [pendingGameId] = useState<number | null>(() => {
        const m = window.location.hash.match(/^#game\/(\d+)$/);
        return m ? parseInt(m[1]) : null;
    });
    // True while we're resolving a #game/ID hash on load
    const [loadingFromHash, setLoadingFromHash] = useState(
        () => !!window.location.hash.match(/^#game\/(\d+)$/)
    );

    useEffect(() => {
        // Checks if the user is already logged in
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setSessionLoading(false);
        });

        // Listens for authentication state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
        return () => subscription.unsubscribe();
    }, []);

    // Gets players
    useEffect(() => {
        fetchPlayers();
    }, []);

    const fetchPlayers = async () => {
        setPlayersLoading(true);
        const { data, error } = await supabase.from('players').select('id, first_name, last_name');
        if (error) {
            console.error("Error fetching players:", error);
        } else if (data) {
            setPlayers(data.map((p: any) => ({
                id: p.id,
                firstName: p.first_name,
                lastName: p.last_name,
            })));
        }
        setPlayersLoading(false);
    };

    // Load game from URL hash — waits for auth and players, rejects if not authenticated
    useEffect(() => {
        if (pendingGameId == null || playersLoading || sessionLoading) return;
        if (!session) {
            history.replaceState(null, '', location.pathname);
            setLoadingFromHash(false);
            return;
        }
        supabase
            .from('games')
            .select('*')
            .eq('id', pendingGameId)
            .single()
            .then(({ data, error }) => {
                if (!error && data) {
                    const gd = buildGameDataFromRow(data, players);
                    if (gd) setGameState(gd);
                }
                setLoadingFromHash(false);
            });
    }, [pendingGameId, playersLoading, sessionLoading]);

    // Updates to supabase whenever our gameState changes
    useEffect(() => {
        if (!gameState) return;

        supabase
            .from('games')
            .update({
                home_score: gameState.homeRuns,
                away_score: gameState.awayRuns,
                away_pitcher_id: gameState.awayPitcher.id,
                home_pitcher_id: gameState.homePitcher.id,
                away_team_lineup_ids: gameState.awayTeamLineup.map(atl => atl.id),
                home_team_lineup_ids: gameState.homeTeamLineup.map(htl => htl.id),
                away_team_is_batting: gameState.awayTeamBatting,
                inning: gameState.inning,
                number_of_outs: gameState.numberOfOuts,
                current_away_team_batter_index: gameState.currAwayTeamBatter,
                current_home_team_batter_index: gameState.currHomeTeamBatter,

                number_on_base: gameState.numberOnBase,
                earned_runs_queue: gameState.earnedRunsQueue,

                game_over: !!gameState.isGameOver
            })
            .eq('id', gameState.gameId)
            .then(({ error }) => {
                if (error) console.error('Failed to update game state:', error);
            });
    }, [gameState]);

    // Keep URL hash in sync with the current page
    useEffect(() => {
        if (gameState) {
            history.replaceState(null, '', `#game/${gameState.gameId}`);
        } else if (spectateGameId !== null) {
            history.replaceState(null, '', `#spectate/${spectateGameId}`);
        } else if (showStatistics) {
            history.replaceState(null, '', '#statistics');
        } else if (!loadingFromHash) {
            history.replaceState(null, '', location.pathname);
        }
    }, [gameState, spectateGameId, showStatistics, loadingFromHash]);

    const content = (() => {
        if (loadingFromHash) return <div style={{ padding: '2rem' }}>Loading game...</div>;
        if (gameState) return <GameLogger gameData={gameState} setGameState={setGameState} />;
        if (spectateGameId !== null) return <Spectate gameId={spectateGameId} onBack={() => setSpectateGameId(null)} />;
        if (showStatistics) return <PlayerStatisticsSelection onBack={() => setShowStatistics(false)} />;
        return (
            <Home
                players={players}
                loading={playersLoading}
                onStartGame={setGameState}
                onSpectateGame={setSpectateGameId}
                onViewStatistics={() => setShowStatistics(true)}
                isAuthenticated={!!session}
            />
        );
    })();

    return (
        <PlayersContext.Provider value={players}>
            {content}
        </PlayersContext.Provider>
    );
}

export default App
