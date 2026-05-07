import { useEffect, useState } from "react";
import './App.css'
import Home from './components/Home.tsx'
import GameLogger from './components/GameLogger.tsx'
import type { GameData } from './types'
import { supabase } from "./supabase-client.ts";

function App() {

    const [gameState, setGameState] = useState<GameData | null>(null);

    /* Debugging use Effects *

    useEffect(() => {
        console.log(gameState);
    }, [gameState])

    /* --------------------- */

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
            current_home_team_batter_index: gameState.currHomeTeamBatter
        })
        .eq('id', gameState.gameId)
        .then(({ error }) => console.log('logs update error:', error));
    })

    if (gameState) {
        return <GameLogger
        gameData={gameState}
        setGameState={setGameState}
        />;
    }

    return (
        <Home onStartGame={setGameState} />
    );
}

export default App