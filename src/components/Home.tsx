import { useState } from 'react';
import { supabase } from '../supabase-client';
import type { Player, GameData } from '../types';
import Select from 'react-select';

type HomeProps = {
    players: Player[];
    loading: boolean;
    onStartGame: (gameData: GameData) => void;
    onSpectateGame: (gameId: number) => void;
    onViewStatistics: () => void;
    isAuthenticated: boolean;
};

/**
 * Home Component
 *
 * This component acts as the pre-game setup screen for the application.
 * It is primarily responsible for:
 * 1. Fetching the master list of players from the Supabase database.
 * 2. Allowing users to construct "Away" and "Home" batting lineups using a drag-and-drop interface.
 * 3. Enforcing game rules:
 *    - Players cannot be on both teams
 *    - Starting pitchers must be active in the lineup
 *    - ...
 * 4. Packaging the finalized lineups and game configuration, and passing them to the parent component
 *    via the `onStartGame` prop to initiate the game state (transitioning to the `AtBat` screen).
 */
function Home({ 
    players, 
    loading, 
    onStartGame, 
    onSpectateGame, 
    onViewStatistics, 
    isAuthenticated
}: HomeProps) {
    const [showPopup, setShowPopup] = useState(false);

    // Lineup state
    const [awayTeamLineup, setAwayTeamLineup] = useState<Player[]>([]);
    const [homeTeamLineup, setHomeTeamLineup] = useState<Player[]>([]);
    const [awayAlltimeDefensePlayers, setAwayAlltimeDefensePlayers] = useState<Player[]>([]);
    const [homeAlltimeDefensePlayers, setHomeAlltimeDefensePlayers] = useState<Player[]>([]);
    const [awayPitcher, setAwayPitcher] = useState<Player | null>(null);
    const [homePitcher, setHomePitcher] = useState<Player | null>(null);

    const [lineupError, setLineupError] = useState<string | null>(null);
    const [isAddingAway, setIsAddingAway] = useState(false);
    const [isAddingHome, setIsAddingHome] = useState(false);
    const [isAddingAwayDefense, setIsAddingAwayDefense] = useState(false);
    const [isAddingHomeDefense, setIsAddingHomeDefense] = useState(false);
    const [isStartingGame, setIsStartingGame] = useState(false);

    const [showResumePopup, setShowResumePopup] = useState(false);
    const [games, setGames] = useState<any[]>([]);
    const [loadingGames, setLoadingGames] = useState(false);
    const [resumeError, setResumeError] = useState<string | null>(null);

    const [showSpectatePopup, setShowSpectatePopup] = useState(false);
    const [spectateGames, setSpectateGames] = useState<any[]>([]);
    const [loadingSpectateGames, setLoadingSpectateGames] = useState(false);
    const [spectateError, setSpectateError] = useState<string | null>(null);

    // Login state
    const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
    const [loginEmail, setLoginEmail] = useState<string>('');
    const [loginPassword, setLoginPassword] = useState<string>('');
    const [loginError, setLoginError] = useState<string | null>(null);
    const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

    const fetchGames = async () => {
        setLoadingGames(true);
        setResumeError(null);
        const { data, error } = await supabase
            .from('games')
            .select('*')
            .eq('game_over', false)
            .order('date', { ascending: false })
            .order('time', { ascending: false, nullsFirst: false });
        if (error) {
            setResumeError(error.message);
        } else {
            setGames(data || []);
        }
        setLoadingGames(false);
    };

    const handleResumeGame = (game: any) => {
        const findPlayer = (id: number) => players.find(p => p.id === id);

        const awayLineup = (game.away_team_lineup_ids || []).map((id: number) => findPlayer(id)).filter(Boolean) as Player[];
        const homeLineup = (game.home_team_lineup_ids || []).map((id: number) => findPlayer(id)).filter(Boolean) as Player[];
        const awayDefensePlayers = (game.away_alltime_defense_ids || []).map((id: number) => findPlayer(id)).filter(Boolean) as Player[];
        const homeDefensePlayers = (game.home_alltime_defense_ids || []).map((id: number) => findPlayer(id)).filter(Boolean) as Player[];
        const awayPitcherPlayer = findPlayer(game.away_pitcher_id);
        const homePitcherPlayer = findPlayer(game.home_pitcher_id);

        if (awayLineup.length === 0 || homeLineup.length === 0) {
            setResumeError('This game does not have enough data to resume.');
            return;
        }

        onStartGame({
            gameId: game.id,
            awayTeamLineup: awayLineup,
            homeTeamLineup: homeLineup,
            awayAlltimeDefensePlayers: awayDefensePlayers,
            homeAlltimeDefensePlayers: homeDefensePlayers,
            awayPitcher: awayPitcherPlayer ?? null,
            homePitcher: homePitcherPlayer ?? null,
            awayTeamBatting: game.away_team_is_batting ?? true,
            inning: game.inning ?? 1,
            numberOfOuts: game.number_of_outs ?? 0,
            awayRuns: game.away_score ?? 0,
            homeRuns: game.home_score ?? 0,
            currAwayTeamBatter: game.current_away_team_batter_index ?? 0,
            currHomeTeamBatter: game.current_home_team_batter_index ?? 0,
            isGameOver: ((game.inning >= 3 && !game.away_team_is_batting && game.home_score > game.away_score) ||
                (game.inning >= 3 && game.away_team_is_batting && game.number_of_outs >= 3 && game.home_score > game.away_score) ||
                (game.inning >= 3 && !game.away_team_is_batting && game.number_of_outs >= 3 && game.away_score !== game.home_score)),
            numberOnBase: game.number_on_base,
            earnedRunsQueue: game.earned_runs_queue
        });
    };

    const startGame = () => {
        setShowPopup(true);
    };

    const openResumePopup = () => {
        setShowResumePopup(true);
        fetchGames();
    };

    const fetchSpectateGames = async () => {
        setLoadingSpectateGames(true);
        setSpectateError(null);
        const { data, error } = await supabase
            .from('games')
            .select('*')
            .order('date', { ascending: false })
            .order('time', { ascending: false, nullsFirst: false });
        if (error) {
            setSpectateError(error.message);
        } else {
            setSpectateGames(data || []);
        }
        setLoadingSpectateGames(false);
    };

    const handleLogin = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        setIsLoggingIn(true);
        setLoginError(null);
        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
        if (error) {
            setLoginError(error.message);
        } else {
            setShowLoginModal(false);
            setLoginEmail('');
            setLoginPassword('');
        }
        setIsLoggingIn(false);
    };

    const openSpectatePopup = () => {
        setShowSpectatePopup(true);
        fetchSpectateGames();
    };

    /**
     * Handles the submission of the start game form.
     * 
     * @param e - The synthetic event from the form submission.
     * 
     * @remarks
     * - Prevents the default form submission behavior.
     * - Calls the `onStartGame` callback passed from the parent component, providing 
     *   the current game configuration (lineups and pitchers).
     * - This action effectively transitions the application from the setup screen to the game state.
     */
    const handleStartGameSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        setIsStartingGame(true);
        setLineupError(null);

        try {
            // 1. Create a new game row
            const { data: gameData, error: gameError } = await supabase
                .from('games')
                .insert([{ date: new Date().toISOString().split('T')[0] }])
                .select()
                .single();

            if (gameError) throw gameError;

            const gameId = gameData.id;

            // 2. Create player_game_stats rows for all players in both lineups and defense slots
            const statsToInsert = [
                ...awayTeamLineup.map(p => ({ player_id: p.id, game_id: gameId, games_played: 1 })),
                ...homeTeamLineup.map(p => ({ player_id: p.id, game_id: gameId, games_played: 1 })),
                ...awayAlltimeDefensePlayers.map(p => ({ player_id: p.id, game_id: gameId, games_played: 1 })),
                ...homeAlltimeDefensePlayers.map(p => ({ player_id: p.id, game_id: gameId, games_played: 1 })),
            ];

            const { error: statsError } = await supabase
                .from('player_game_stats')
                .insert(statsToInsert);

            if (statsError) throw statsError;

            // 3. Start the game locally!
            onStartGame({
                gameId,
                awayTeamLineup,
                homeTeamLineup,
                awayAlltimeDefensePlayers,
                homeAlltimeDefensePlayers,
                awayPitcher,
                homePitcher,

                awayTeamBatting: true,
                inning: 1,
                numberOfOuts: 0,

                awayRuns: 0,
                homeRuns: 0,

                currAwayTeamBatter: 0,
                currHomeTeamBatter: 0,

                isGameOver: false,

                numberOnBase: 0,
                earnedRunsQueue: []
            });
        } catch (error: any) {
            console.error("Error creating game:", error);
            setLineupError(error.message || "Failed to create game in the database.");
        } finally {
            setIsStartingGame(false);
        }
    };

    /**
     * Adds a player to a specified team's lineup.
     * 
     * @param team - The team to add the player to ('away' or 'home').
     * @param playerId - The ID of the player to add.
     * 
     * @remarks
     * - Checks if the player is already in the opposing team's lineup and prevents duplicates.
     * - Updates the state of the relevant team's lineup.
     * - Clears any existing lineup errors.
     */
    const addPlayerToLineup = (team: 'away' | 'home', player: Player) => {
        setLineupError(null);
        if (team === 'away') {
            if (homeTeamLineup.some(p => p.id === player.id)) {
                setLineupError(`${player.firstName} ${player.lastName} is already in the Home lineup.`);
                return;
            }
            if (!awayTeamLineup.some(p => p.id === player.id)) setAwayTeamLineup([...awayTeamLineup, player]);
        } else {
            if (awayTeamLineup.some(p => p.id === player.id)) {
                setLineupError(`${player.firstName} ${player.lastName} is already in the Away lineup.`);
                return;
            }
            if (!homeTeamLineup.some(p => p.id === player.id)) setHomeTeamLineup([...homeTeamLineup, player]);
        }
    };

    /**
     * Removes a player from a specified team's lineup.
     * 
     * @param team - The team to remove the player from ('away' or 'home').
     * @param index - The index of the player to remove from the lineup array.
     * 
     * @remarks
     * - If the removed player is the current starting pitcher for that team, the pitcher state is reset to empty ('').
     * - Updates the state of the relevant team's lineup by filtering out the specified index.
     */
    const removePlayerFromLineup = (team: 'away' | 'home', index: number) => {
        if (team === 'away') {
            const removedPlayer = awayTeamLineup[index];
            if (awayPitcher?.id === removedPlayer.id) setAwayPitcher(null);
            setAwayTeamLineup(prev => prev.filter((_, i) => i !== index));
        } else {
            const removedPlayer = homeTeamLineup[index];
            if (homePitcher?.id === removedPlayer.id) setHomePitcher(null);
            setHomeTeamLineup(prev => prev.filter((_, i) => i !== index));
        }
    };

    const addPlayerToDefense = (team: 'away' | 'home', player: Player) => {
        setLineupError(null);
        if (team === 'away') {
            if (homeTeamLineup.some(p => p.id === player.id) || homeAlltimeDefensePlayers.some(p => p.id === player.id)) {
                setLineupError(`${player.firstName} ${player.lastName} is already on the Home team.`);
                return;
            }
            if (!awayTeamLineup.some(p => p.id === player.id) && !awayAlltimeDefensePlayers.some(p => p.id === player.id)) {
                setAwayAlltimeDefensePlayers(prev => [...prev, player]);
            }
        } else {
            if (awayTeamLineup.some(p => p.id === player.id) || awayAlltimeDefensePlayers.some(p => p.id === player.id)) {
                setLineupError(`${player.firstName} ${player.lastName} is already on the Away team.`);
                return;
            }
            if (!homeTeamLineup.some(p => p.id === player.id) && !homeAlltimeDefensePlayers.some(p => p.id === player.id)) {
                setHomeAlltimeDefensePlayers(prev => [...prev, player]);
            }
        }
    };

    const removePlayerFromDefense = (team: 'away' | 'home', index: number) => {
        if (team === 'away') {
            const removed = awayAlltimeDefensePlayers[index];
            if (awayPitcher?.id === removed.id) setAwayPitcher(null);
            setAwayAlltimeDefensePlayers(prev => prev.filter((_, i) => i !== index));
        } else {
            const removed = homeAlltimeDefensePlayers[index];
            if (homePitcher?.id === removed.id) setHomePitcher(null);
            setHomeAlltimeDefensePlayers(prev => prev.filter((_, i) => i !== index));
        }
    };

    const movePlayer = (team: 'away' | 'home', index: number, direction: 'up' | 'down') => {
        const swap = (arr: Player[], i: number, j: number) => {
            const next = [...arr];
            [next[i], next[j]] = [next[j], next[i]];
            return next;
        };
        const j = direction === 'up' ? index - 1 : index + 1;
        if (team === 'away') {
            setAwayTeamLineup(prev => swap(prev, index, j));
        } else {
            setHomeTeamLineup(prev => swap(prev, index, j));
        }
    };

    // Calculate available players dynamically by filtering out anyone already in a lineup or defense slot
    const availablePlayers = players.filter(p =>
        !awayTeamLineup.some(lp => lp.id === p.id) &&
        !homeTeamLineup.some(lp => lp.id === p.id) &&
        !awayAlltimeDefensePlayers.some(lp => lp.id === p.id) &&
        !homeAlltimeDefensePlayers.some(lp => lp.id === p.id)
    );

    const renderTeamSection = (
        title: string,
        team: 'away' | 'home',
        lineup: Player[],
        pitcher: Player | null,
        setPitcher: React.Dispatch<React.SetStateAction<Player | null>>
    ) => {
        const isAdding = team === 'away' ? isAddingAway : isAddingHome;
        const setIsAdding = team === 'away' ? setIsAddingAway : setIsAddingHome;
        const isAddingDefense = team === 'away' ? isAddingAwayDefense : isAddingHomeDefense;
        const setIsAddingDefense = team === 'away' ? setIsAddingAwayDefense : setIsAddingHomeDefense;
        const alltimeDefensePlayers = team === 'away' ? awayAlltimeDefensePlayers : homeAlltimeDefensePlayers;

        return (
            <div style={{ flex: '1 1 250px' }}>
                <h3 style={{ color: '#9ca3af', marginBottom: '4px' }}>{title}</h3>
                <span style={{
                    display: 'inline-block',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    letterSpacing: '0.05em',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    marginBottom: '16px',
                    backgroundColor: team === 'away' ? '#14532d' : '#1e3a5f',
                    color: team === 'away' ? '#86efac' : '#93c5fd',
                }}>
                    {team === 'away' ? 'BATS FIRST' : 'PITCHES FIRST'}
                </span>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Batting Order</label>
                    <div
                        style={{ backgroundColor: '#374151', borderRadius: '6px', padding: '10px', border: '1px solid #4b5563' }}
                    >
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {lineup.map((player, index) => {
                                return (
                                    <li
                                        key={player.id}
                                        style={{
                                            padding: '8px',
                                            marginBottom: '5px',
                                            backgroundColor: '#4b5563',
                                            borderRadius: '4px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <span style={{ display: 'flex', alignItems: 'center' }}>
                                            <span style={{ color: '#9ca3af', marginRight: '10px', width: '20px', display: 'inline-block' }}>{index + 1}.</span>
                                            {`${player.firstName} ${player.lastName}`}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                            <button
                                                type="button"
                                                onClick={() => movePlayer(team, index, 'up')}
                                                disabled={index === 0}
                                                style={{ background: 'none', border: 'none', color: index === 0 ? '#6b7280' : '#9ca3af', cursor: index === 0 ? 'default' : 'pointer', fontSize: '1.1rem', padding: '4px 8px' }}
                                            >
                                                ▲
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => movePlayer(team, index, 'down')}
                                                disabled={index === lineup.length - 1}
                                                style={{ background: 'none', border: 'none', color: index === lineup.length - 1 ? '#6b7280' : '#9ca3af', cursor: index === lineup.length - 1 ? 'default' : 'pointer', fontSize: '1.1rem', padding: '4px 8px' }}
                                            >
                                                ▼
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removePlayerFromLineup(team, index)}
                                                style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', padding: '4px 8px' }}
                                            >
                                                ✕
                                            </button>
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>

                        {!isAdding ? (
                            <div
                                onClick={() => setIsAdding(true)}
                                style={{
                                    textAlign: 'center', color: '#9ca3af',
                                    fontSize: lineup.length === 0 ? '1.5rem' : '1.2rem',
                                    padding: '5px', borderRadius: '4px', cursor: 'pointer',
                                    marginTop: lineup.length > 0 ? '10px' : '0',
                                    border: '1px dashed #4b5563'
                                }}
                            >
                                +
                            </div>
                        ) : (
                            <div style={{ marginTop: lineup.length === 0 ? '0' : '10px' }}>
                                <Select
                                    autoFocus
                                    menuIsOpen={true}
                                    placeholder="Search Player..."
                                    options={availablePlayers.map(p => ({
                                        value: p.id,
                                        label: `${p.firstName} ${p.lastName}`
                                    }))}
                                    onChange={(selectedOption: any) => {
                                        if (selectedOption) {
                                            const player = players.find(p => p.id === selectedOption.value);
                                            if (player) addPlayerToLineup(team, player);
                                            setIsAdding(false);
                                        }
                                    }}
                                    onBlur={() => setIsAdding(false)}
                                    styles={{
                                        control: (base) => ({
                                            ...base,
                                            backgroundColor: '#4b5563',
                                            borderColor: '#6b7280',
                                            color: 'white',
                                            boxShadow: 'none',
                                            '&:hover': {
                                                borderColor: '#9ca3af'
                                            }
                                        }),
                                        menu: (base) => ({
                                            ...base,
                                            backgroundColor: '#374151',
                                            color: 'white',
                                            zIndex: 9999
                                        }),
                                        option: (base, state) => ({
                                            ...base,
                                            backgroundColor: state.isFocused ? '#4b5563' : '#374151',
                                            color: 'white',
                                            cursor: 'pointer',
                                            ':active': {
                                                backgroundColor: '#4b5563'
                                            }
                                        }),
                                        singleValue: (base) => ({
                                            ...base,
                                            color: 'white'
                                        }),
                                        input: (base) => ({
                                            ...base,
                                            color: 'white'
                                        })
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Alltime Defense Players</label>
                    <div style={{ backgroundColor: '#374151', borderRadius: '6px', padding: '10px', border: '1px solid #4b5563' }}>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {alltimeDefensePlayers.map((player, index) => (
                                <li
                                    key={player.id}
                                    style={{
                                        padding: '8px',
                                        marginBottom: '5px',
                                        backgroundColor: '#4b5563',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <span>{`${player.firstName} ${player.lastName}`}</span>
                                    <button
                                        type="button"
                                        onClick={() => removePlayerFromDefense(team, index)}
                                        style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', padding: '4px 8px' }}
                                    >
                                        ✕
                                    </button>
                                </li>
                            ))}
                        </ul>
                        {!isAddingDefense ? (
                            <div
                                onClick={() => setIsAddingDefense(true)}
                                style={{
                                    textAlign: 'center', color: '#9ca3af',
                                    fontSize: alltimeDefensePlayers.length === 0 ? '1.5rem' : '1.2rem',
                                    padding: '5px', borderRadius: '4px', cursor: 'pointer',
                                    marginTop: alltimeDefensePlayers.length > 0 ? '10px' : '0',
                                    border: '1px dashed #4b5563'
                                }}
                            >
                                +
                            </div>
                        ) : (
                            <div style={{ marginTop: '10px' }}>
                                <Select
                                    autoFocus
                                    menuIsOpen={true}
                                    placeholder="Search Player..."
                                    options={availablePlayers.map(p => ({
                                        value: p.id,
                                        label: `${p.firstName} ${p.lastName}`
                                    }))}
                                    onChange={(selectedOption: any) => {
                                        if (selectedOption) {
                                            const player = players.find(p => p.id === selectedOption.value);
                                            if (player) addPlayerToDefense(team, player);
                                            setIsAddingDefense(false);
                                        }
                                    }}
                                    onBlur={() => setIsAddingDefense(false)}
                                    styles={{
                                        control: (base) => ({ ...base, backgroundColor: '#4b5563', borderColor: '#6b7280', color: 'white', boxShadow: 'none', '&:hover': { borderColor: '#9ca3af' } }),
                                        menu: (base) => ({ ...base, backgroundColor: '#374151', color: 'white', zIndex: 9999 }),
                                        option: (base, state) => ({ ...base, backgroundColor: state.isFocused ? '#4b5563' : '#374151', color: 'white', cursor: 'pointer', ':active': { backgroundColor: '#4b5563' } }),
                                        singleValue: (base) => ({ ...base, color: 'white' }),
                                        input: (base) => ({ ...base, color: 'white' }),
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Starting Pitcher (optional)</label>
                    <Select
                        placeholder="Select Pitcher"
                        value={pitcher ? {
                            value: pitcher.id,
                            label: `${pitcher.firstName} ${pitcher.lastName}`
                        } : null}
                        onChange={(selectedOption: any) => {
                            const player = [...lineup, ...alltimeDefensePlayers].find(p => p.id === selectedOption?.value);
                            setPitcher(player || null);
                        }}
                        options={[...lineup, ...alltimeDefensePlayers].map(p => ({
                            value: p.id,
                            label: `${p.firstName} ${p.lastName}`
                        }))}
                        isSearchable={true}
                        styles={{
                            control: (base) => ({
                                ...base,
                                backgroundColor: '#374151',
                                borderColor: '#4b5563',
                                color: 'white',
                                boxShadow: 'none',
                                '&:hover': {
                                    borderColor: '#9ca3af'
                                }
                            }),
                            menu: (base) => ({
                                ...base,
                                backgroundColor: '#374151',
                                color: 'white',
                                zIndex: 9999
                            }),
                            option: (base, state) => ({
                                ...base,
                                backgroundColor: state.isFocused ? '#4b5563' : '#374151',
                                color: 'white',
                                cursor: 'pointer',
                                ':active': {
                                    backgroundColor: '#4b5563'
                                }
                            }),
                            singleValue: (base) => ({
                                ...base,
                                color: 'white'
                            }),
                            input: (base) => ({
                                ...base,
                                color: 'white'
                            })
                        }}
                    />
                </div>
            </div>
        )
    };

    const formatGameTime = (date: string, time: string | null) => {
        if (!time) return null;
        return new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Los_Angeles',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        }).format(new Date(`${date}T${time}Z`));
    };

    return (
        <div className="home-container" style={{ padding: '2rem', textAlign: 'center' }}>
            <h1>Wiffle Ball Stats</h1>
            <p>Welcome to the Wiffle Ball Stat Tracker!</p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
                <button
                    onClick={startGame}
                    disabled={loading || !isAuthenticated}
                    title={!isAuthenticated ? "Sign in to start a new game" : undefined}
                    style={{
                        padding: '12px 24px',
                        fontSize: '1.2rem',
                        cursor: loading || !isAuthenticated ? 'not-allowed' : 'pointer',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        opacity: !isAuthenticated ? 0.5 : 1,
                    }}
                >
                    {loading ? "Loading Players..." : "Start a New Game"}
                </button>
                <button
                    onClick={openResumePopup}
                    disabled={loading || !isAuthenticated}
                    title={!isAuthenticated ? "Sign in to resume a game" : undefined}
                    style={{
                        padding: '12px 24px',
                        fontSize: '1.2rem',
                        cursor: loading || !isAuthenticated ? 'not-allowed' : 'pointer',
                        backgroundColor: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        opacity: !isAuthenticated ? 0.5 : 1,
                    }}
                >
                    Resume a Game
                </button>
                <button
                    onClick={openSpectatePopup}
                    disabled={loading}
                    style={{
                        padding: '12px 24px',
                        fontSize: '1.2rem',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        backgroundColor: '#4b5563',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                    }}
                >
                    Spectate a Game
                </button>
                <button
                    onClick={onViewStatistics}
                    style={{
                        padding: '12px 24px',
                        fontSize: '1.2rem',
                        cursor: 'pointer',
                        backgroundColor: '#374151',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                    }}
                >
                    View Statistics
                </button>
            </div>

            <div style={{ marginTop: '14px', fontSize: '0.875rem', color: '#9ca3af' }}>
                {isAuthenticated ? (
                    <span>
                        Signed in &nbsp;|&nbsp;
                        <button
                            onClick={() => supabase.auth.signOut()}
                            style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.875rem', padding: 0 }}
                        >
                            Sign Out
                        </button>
                    </span>
                ) : (
                    <span>
                        League members:&nbsp;
                        <button
                            onClick={() => setShowLoginModal(true)}
                            style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.875rem', padding: 0 }}
                        >
                            Sign In
                        </button>
                    </span>
                )}
            </div>

            {showPopup && (
                <div className="popup-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
                    justifyContent: 'center', alignItems: 'center', zIndex: 1000,
                    padding: '1rem'
                }}>
                    <div className="popup-content" style={{
                        backgroundColor: '#1f2937', padding: '30px', borderRadius: '12px',
                        maxHeight: '90vh', overflowY: 'auto', border: '1px solid #374151',
                        width: '100%', maxWidth: '700px', color: 'white', textAlign: 'left',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #374151', paddingBottom: '15px', marginBottom: '15px' }}>
                            <button
                                type="button"
                                onClick={() => setShowPopup(false)}
                                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.5rem', padding: '0 15px 0 0', display: 'flex', alignItems: 'center' }}
                                aria-label="Go Back"
                            >
                                &larr;
                            </button>
                            <h2 style={{ marginTop: 0, marginBottom: 0, flex: 1, textAlign: 'center', marginRight: '30px' }}>
                                Set Lineups
                            </h2>
                        </div>

                        {lineupError && (
                            <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '6px', marginBottom: '15px', textAlign: 'center' }}>
                                {lineupError}
                            </div>
                        )}

                        <form onSubmit={handleStartGameSubmit}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '40px', marginTop: '20px' }}>

                                {renderTeamSection('Away Team', 'away', awayTeamLineup, awayPitcher, setAwayPitcher)}
                                {renderTeamSection('Home Team', 'home', homeTeamLineup, homePitcher, setHomePitcher)}

                            </div>

                            <div style={{ marginTop: '35px', display: 'flex', justifyContent: 'flex-end', gap: '15px', borderTop: '1px solid #374151', paddingTop: '20px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowPopup(false)}
                                    style={{ padding: '10px 20px', backgroundColor: '#4b5563', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Go Back
                                </button>
                                <button
                                    type="submit"
                                    className="submit-btn"
                                    disabled={isStartingGame}
                                    style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none' }}
                                >
                                    {isStartingGame ? "Setting up..." : "Play Ball!"}
                                </button>
                            </div>
                        </form>

                    </div>
                </div>
            )}

            {showResumePopup && (
                <div className="popup-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
                    justifyContent: 'center', alignItems: 'center', zIndex: 1000,
                    padding: '1rem'
                }}>
                    <div style={{
                        backgroundColor: '#1f2937', padding: '30px', borderRadius: '12px',
                        maxHeight: '80vh', overflowY: 'auto', border: '1px solid #374151',
                        width: '100%', maxWidth: '500px', color: 'white', textAlign: 'left',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #374151', paddingBottom: '15px', marginBottom: '15px' }}>
                            <button
                                type="button"
                                onClick={() => setShowResumePopup(false)}
                                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.5rem', padding: '0 15px 0 0', display: 'flex', alignItems: 'center' }}
                                aria-label="Go Back"
                            >
                                &larr;
                            </button>
                            <h2 style={{ marginTop: 0, marginBottom: 0, flex: 1, textAlign: 'center', marginRight: '30px' }}>
                                Resume a Game
                            </h2>
                        </div>

                        {resumeError && (
                            <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '6px', marginBottom: '15px', textAlign: 'center' }}>
                                {resumeError}
                            </div>
                        )}

                        {loadingGames ? (
                            <p style={{ textAlign: 'center', color: '#9ca3af' }}>Loading games...</p>
                        ) : games.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#9ca3af' }}>No games found.</p>
                        ) : (
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {games.map(game => (
                                    <li
                                        key={game.id}
                                        onClick={() => handleResumeGame(game)}
                                        style={{
                                            padding: '12px 16px',
                                            marginBottom: '8px',
                                            backgroundColor: '#374151',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            border: '1px solid #4b5563',
                                            display: 'flex',
                                            flexWrap: 'wrap', gap: '10px',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#4b5563')}
                                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#374151')}
                                    >
                                        <span style={{ fontWeight: 'bold' }}>
                                            {game.date}{game.time ? ' — ' + formatGameTime(game.date, game.time) : ''}
                                        </span>
                                        <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                                            Away {game.away_score ?? 0} – {game.home_score ?? 0} Home &nbsp;|&nbsp; Inning {game.inning ?? 1}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #374151', paddingTop: '15px' }}>
                            <button
                                onClick={() => setShowResumePopup(false)}
                                style={{ padding: '10px 20px', backgroundColor: '#4b5563', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSpectatePopup && (
                <div className="popup-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
                    justifyContent: 'center', alignItems: 'center', zIndex: 1000,
                    padding: '1rem'
                }}>
                    <div style={{
                        backgroundColor: '#1f2937', padding: '30px', borderRadius: '12px',
                        maxHeight: '80vh', overflowY: 'auto', border: '1px solid #374151',
                        width: '100%', maxWidth: '500px', color: 'white', textAlign: 'left',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #374151', paddingBottom: '15px', marginBottom: '15px' }}>
                            <button
                                type="button"
                                onClick={() => setShowSpectatePopup(false)}
                                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.5rem', padding: '0 15px 0 0', display: 'flex', alignItems: 'center' }}
                                aria-label="Go Back"
                            >
                                &larr;
                            </button>
                            <h2 style={{ marginTop: 0, marginBottom: 0, flex: 1, textAlign: 'center', marginRight: '30px' }}>
                                Spectate a Game
                            </h2>
                        </div>

                        {spectateError && (
                            <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '6px', marginBottom: '15px', textAlign: 'center' }}>
                                {spectateError}
                            </div>
                        )}

                        {loadingSpectateGames ? (
                            <p style={{ textAlign: 'center', color: '#9ca3af' }}>Loading games...</p>
                        ) : spectateGames.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#9ca3af' }}>No games found.</p>
                        ) : (
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {spectateGames.map(game => (
                                    <li
                                        key={game.id}
                                        onClick={() => { setShowSpectatePopup(false); onSpectateGame(game.id); }}
                                        style={{
                                            padding: '12px 16px',
                                            marginBottom: '8px',
                                            backgroundColor: '#374151',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            border: '1px solid #4b5563',
                                            display: 'flex',
                                            flexWrap: 'wrap', gap: '10px',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#4b5563')}
                                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#374151')}
                                    >
                                        <span style={{ fontWeight: 'bold' }}>
                                            {game.date}{game.time ? ' — ' + formatGameTime(game.date, game.time) : ''}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                                                Away {game.away_score ?? 0} – {game.home_score ?? 0} Home &nbsp;|&nbsp; Inning {game.inning ?? 1}
                                            </span>
                                            {game.game_over
                                                ? <span style={{ backgroundColor: '#374151', color: '#9ca3af', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #4b5563' }}>FINAL</span>
                                                : <span style={{ backgroundColor: '#166534', color: '#86efac', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>LIVE</span>
                                            }
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #374151', paddingTop: '15px' }}>
                            <button
                                onClick={() => setShowSpectatePopup(false)}
                                style={{ padding: '10px 20px', backgroundColor: '#4b5563', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showLoginModal && (
                <div className="popup-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
                    justifyContent: 'center', alignItems: 'center', zIndex: 1000,
                    padding: '1rem'
                }}>
                    <div style={{
                        backgroundColor: '#1f2937', padding: '30px', borderRadius: '12px',
                        border: '1px solid #374151', width: '100%', maxWidth: '360px',
                        color: 'white', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #374151', paddingBottom: '15px', marginBottom: '20px' }}>
                            <button
                                type="button"
                                onClick={() => { setShowLoginModal(false); setLoginError(null); }}
                                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.5rem', padding: '0 15px 0 0', display: 'flex', alignItems: 'center' }}
                                aria-label="Close"
                            >
                                &larr;
                            </button>
                            <h2 style={{ margin: 0, flex: 1, textAlign: 'center', marginRight: '30px' }}>Sign In</h2>
                        </div>

                        {loginError && (
                            <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '6px', marginBottom: '15px', textAlign: 'center', fontSize: '0.875rem' }}>
                                {loginError}
                            </div>
                        )}

                        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', color: '#9ca3af' }}>Email</label>
                                <input
                                    type="email"
                                    value={loginEmail}
                                    onChange={e => setLoginEmail(e.target.value)}
                                    required
                                    style={{ width: '100%', padding: '10px', backgroundColor: '#374151', border: '1px solid #4b5563', borderRadius: '6px', color: 'white', fontSize: '1rem', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', color: '#9ca3af' }}>Password</label>
                                <input
                                    type="password"
                                    value={loginPassword}
                                    onChange={e => setLoginPassword(e.target.value)}
                                    required
                                    style={{ width: '100%', padding: '10px', backgroundColor: '#374151', border: '1px solid #4b5563', borderRadius: '6px', color: 'white', fontSize: '1rem', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #374151', paddingTop: '16px', marginTop: '6px' }}>
                                <button
                                    type="button"
                                    onClick={() => { setShowLoginModal(false); setLoginError(null); }}
                                    style={{ padding: '10px 20px', backgroundColor: '#4b5563', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoggingIn}
                                    style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: isLoggingIn ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: isLoggingIn ? 0.7 : 1 }}
                                >
                                    {isLoggingIn ? "Signing in..." : "Sign In"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Home;
