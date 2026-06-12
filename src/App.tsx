import { useEffect, useState } from "react";
import './App.css';
import Home from './components/Home.tsx';
import GameLogger from './components/GameLogger.tsx';
import Spectate from './components/Spectate.tsx';
import PlayerStatisticsSelection from './components/statistics/PlayerStatisticsSelection.tsx';
import Chat from './components/Chat.tsx';
import type { GameData, Player } from './types';
import { supabase } from "./supabase-client.ts";
import PlayersContext from './contexts/PlayersContext.tsx';
import { StatsDataProvider } from './contexts/StatsDataContext.tsx';
import { buildGameDataFromRow } from './utils/buildGameDataFromRow.ts';
import type { Session } from '@supabase/supabase-js';

function App() {

    const [gameState, setGameState] = useState<GameData | null>(null);
    const [spectateGameId, setSpectateGameId] = useState<number | null>(() => {
        const m = window.location.hash.match(/^#spectate\/(\d+)$/);
        return m ? parseInt(m[1]) : null;
    });
    const [showStatistics, setShowStatistics] = useState(
        () => window.location.hash === '#statistics' || window.location.hash.startsWith('#statistics/')
    );
    const [showChat, setShowChat] = useState(
        () => window.location.hash === '#chat'
    );
    const [initialPlayerSlug] = useState<string | null>(
        () => window.location.hash.match(/^#statistics\/(.+)$/)?.[1] ?? null
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

    // Keep URL hash in sync with the current page
    useEffect(() => {
        if (gameState) {
            history.replaceState(null, '', `#game/${gameState.gameId}`);
        } else if (spectateGameId !== null) {
            history.replaceState(null, '', `#spectate/${spectateGameId}`);
        } else if (showChat) {
            history.replaceState(null, '', '#chat');
        } else if (showStatistics) {
            if (!window.location.hash.startsWith('#statistics/')) {
                history.replaceState(null, '', '#statistics');
            }
        } else if (!loadingFromHash) {
            history.replaceState(null, '', location.pathname);
        }
    }, [gameState, spectateGameId, showChat, showStatistics, loadingFromHash]);

    const content = (() => {
        if (loadingFromHash) return <div style={{ padding: '2rem' }}>Loading game...</div>;
        if (gameState) return <GameLogger gameData={gameState} setGameState={setGameState} />;
        if (spectateGameId !== null) return <Spectate gameId={spectateGameId} onBack={() => setSpectateGameId(null)} />;
        if (showChat) return (
            <StatsDataProvider>
                <Chat onBack={() => setShowChat(false)} />
            </StatsDataProvider>
        );
        if (showStatistics) return (
            <StatsDataProvider>
                <PlayerStatisticsSelection onBack={() => setShowStatistics(false)} initialPlayerSlug={initialPlayerSlug} />
            </StatsDataProvider>
        );
        return (
            <Home
                players={players}
                loading={playersLoading}
                onStartGame={setGameState}
                onSpectateGame={setSpectateGameId}
                onViewStatistics={() => setShowStatistics(true)}
                onOpenChat={() => setShowChat(true)}
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
