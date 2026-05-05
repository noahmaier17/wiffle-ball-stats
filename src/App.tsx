import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import './App.css'
import Home from './components/Home.tsx'
import GameLogger from './components/GameLogger.tsx'
import type { GameData, AtBatLog } from './types'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

function App() {

  const [gameState, setGameState] = useState<GameData | null>(null);

  /* Debugging use Effects */

  useEffect(() => {
    console.log(gameState);
  }, [gameState])

  /* --------------------- */

  const handleLogAtBat = (atBat: AtBatLog) => {
    setGameState(prev => {
      if (!prev) return prev;

      let returnGameState: GameData = { ...prev };

      if (prev.awayTeamBatting) {
        returnGameState = {
          ...returnGameState,
          currAwayTeamBatter: (returnGameState.currAwayTeamBatter + 1) % returnGameState.awayTeamLineup.length,
          awayRuns: returnGameState.awayRuns + atBat.rbis
        };
      } else {
        returnGameState = {
          ...returnGameState,
          currHomeTeamBatter: (returnGameState.currHomeTeamBatter + 1) % returnGameState.homeTeamLineup.length,
          homeRuns: returnGameState.homeRuns + atBat.rbis
        };
      }

      return returnGameState;
    });
  };

  if (gameState) {
    return <GameLogger gameData={gameState} onUpdateGameState={handleLogAtBat} />;
  }

  return (
    <Home onStartGame={setGameState} />
  );
}

export default App
