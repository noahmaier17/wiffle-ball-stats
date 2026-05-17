import { useEffect, useState } from "react";
import './App.css';
import Home from './components/Home.tsx';
import GameLogger from './components/GameLogger.tsx';
import Spectate from './components/Spectate.tsx';
import PlayerStatisticsDepot from './components/statistics/PlayerStatisticsDepot.tsx';
import type { GameData, Player } from './types';
import { supabase } from "./supabase-client.ts";
import type { Session } from '@supabase/supabase-js';

function App() {

    const [gameState, setGameState] = useState<GameData | null>(null);
    const [spectateGameId, setSpectateGameId] = useState<number | null>(null);
    const [showStatistics, setShowStatistics] = useState(false);
    const [players, setPlayers] = useState<Player[]>([]);
    const [playersLoading, setPlayersLoading] = useState(true);

    const [session, setSession] = useState<Session | null>(null);

    useEffect(() => {
        // Checks if the user is already logged in
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session));

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
                game_over: !!gameState.isGameOver
            })
            .eq('id', gameState.gameId)
            .then(({ error }) => {
                if (error) console.error('Failed to update game state:', error);
            });
    }, [gameState]);

    if (gameState) {
        return <GameLogger
            gameData={gameState}
            setGameState={setGameState}
        />;
    }

    if (spectateGameId !== null) {
        return <Spectate gameId={spectateGameId} onBack={() => setSpectateGameId(null)} />;
    }

    if (showStatistics) {
        return <PlayerStatisticsDepot players={players} onBack={() => setShowStatistics(false)} />;
    }

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
}

export default App
