import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import './App.css'
import Home from './components/Home.tsx'
import AtBat from './components/AtBat.tsx'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

function App() {
  const [gameState, setGameState] = useState<any>(null);

  if (gameState) {
    return <AtBat gameState={gameState} />
  }

  return (
    <Home onStartGame={setGameState} />
  );
}

export default App
