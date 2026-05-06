import { useState, useEffect } from "react";
import './App.css'
import Home from './components/Home.tsx'
import GameLogger from './components/GameLogger.tsx'
import type { GameData, AtBatLog } from './types'

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

      // 1. Calculate outs
      let outsAdded = 0;
      const sign = atBat.outcomeSign;
      if (sign === 'K' || sign === 'KI' || sign === 'Out in Play') {
        outsAdded = 1;
      }

      let newOuts = returnGameState.numberOfOuts + outsAdded;
      let switchSides = false;

      if (newOuts >= 3) {
        switchSides = true;
        newOuts = 0;
      }

      returnGameState.numberOfOuts = newOuts;

      // 2. Advance Batter and Runs
      if (prev.awayTeamBatting) {
        returnGameState.currAwayTeamBatter = (returnGameState.currAwayTeamBatter + 1) % returnGameState.awayTeamLineup.length;
        returnGameState.awayRuns += atBat.rbis;
      } else {
        returnGameState.currHomeTeamBatter = (returnGameState.currHomeTeamBatter + 1) % returnGameState.homeTeamLineup.length;
        returnGameState.homeRuns += atBat.rbis;
      }

      // 3. Handle inning rollover
      if (switchSides) {
        if (!prev.awayTeamBatting) {
          returnGameState.inning += 1;
        }
        returnGameState.awayTeamBatting = !prev.awayTeamBatting;
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
