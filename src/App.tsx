import { useState } from "react";
import './App.css'
import Home from './components/Home.tsx'
import GameLogger from './components/GameLogger.tsx'
import type { GameData } from './types'

function App() {

  const [gameState, setGameState] = useState<GameData | null>(null);

  /* Debugging use Effects *

  useEffect(() => {
    console.log(gameState);
  }, [gameState])

  /* --------------------- */

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