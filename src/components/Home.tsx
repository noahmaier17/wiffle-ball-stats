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
function Home({ players, loading, onStartGame, onSpectateGame, onViewStatistics }: HomeProps) {
    const [showPopup, setShowPopup] = useState(false);

    // Lineup state
    const [awayTeamLineup, setAwayTeamLineup] = useState<Player[]>([]);
    const [homeTeamLineup, setHomeTeamLineup] = useState<Player[]>([]);
    const [awayPitcher, setAwayPitcher] = useState<Player | null>(null);
    const [homePitcher, setHomePitcher] = useState<Player | null>(null);

    const [lineupError, setLineupError] = useState<string | null>(null);
    const [isAddingAway, setIsAddingAway] = useState(false);
    const [isAddingHome, setIsAddingHome] = useState(false);
    const [isStartingGame, setIsStartingGame] = useState(false);

    const [showResumePopup, setShowResumePopup] = useState(false);
    const [games, setGames] = useState<any[]>([]);
    const [loadingGames, setLoadingGames] = useState(false);
    const [resumeError, setResumeError] = useState<string | null>(null);

    const [showSpectatePopup, setShowSpectatePopup] = useState(false);
    const [spectateGames, setSpectateGames] = useState<any[]>([]);
    const [loadingSpectateGames, setLoadingSpectateGames] = useState(false);
    const [spectateError, setSpectateError] = useState<string | null>(null);

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
        const awayPitcherPlayer = findPlayer(game.away_pitcher_id);
        const homePitcherPlayer = findPlayer(game.home_pitcher_id);

        if (!awayPitcherPlayer || !homePitcherPlayer || awayLineup.length === 0 || homeLineup.length === 0) {
            setResumeError('This game does not have enough data to resume.');
            return;
        }

        onStartGame({
            gameId: game.id,
            awayTeamLineup: awayLineup,
            homeTeamLineup: homeLineup,
            awayPitcher: awayPitcherPlayer,
            homePitcher: homePitcherPlayer,
            awayTeamBatting: game.away_team_is_batting ?? true,
            inning: game.inning ?? 1,
            numberOfOuts: game.number_of_outs ?? 0,
            awayRuns: game.away_score ?? 0,
            homeRuns: game.home_score ?? 0,
            currAwayTeamBatter: game.current_away_team_batter_index ?? 0,
            currHomeTeamBatter: game.current_home_team_batter_index ?? 0,
            isGameOver: ((game.inning >= 3 && !game.away_team_is_batting && game.home_score > game.away_score) ||
                (game.inning >= 3 && game.away_team_is_batting && game.number_of_outs >= 3 && game.home_score > game.away_score) ||
                (game.inning >= 3 && !game.away_team_is_batting && game.number_of_outs >= 3 && game.away_score !== game.home_score))
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
        if (awayPitcher === null || homePitcher === null) {
            setLineupError('Both teams must have a starting pitcher selected.');
            return;
        }

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

            // 2. Create player_game_stats rows for all players in both lineups
            const statsToInsert = [
                ...awayTeamLineup.map(p => ({ player_id: p.id, game_id: gameId, games_played: 1 })),
                ...homeTeamLineup.map(p => ({ player_id: p.id, game_id: gameId, games_played: 1 }))
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
                awayPitcher,
                homePitcher,

                awayTeamBatting: true,
                inning: 1,
                numberOfOuts: 0,

                awayRuns: 0,
                homeRuns: 0,

                currAwayTeamBatter: 0,
                currHomeTeamBatter: 0,
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

    /**
     * Handles the start of a drag operation.
     * 
     * @param e - The drag event.
     * @param team - The team the dragged player belongs to ('away' or 'home').
     * @param index - The index of the dragged player in the lineup array.
     * 
     * @remarks
     * - Stores the `team` and `index` in the event's data transfer object, which will be used 
     *   in the `handleDrop` event to identify the dragged item.
     */
    const handleDragStart = (e: React.DragEvent, team: 'away' | 'home', index: number) => {
        e.dataTransfer.setData('team', team);
        e.dataTransfer.setData('index', index.toString());
    };

    /**
     * Handles the drag over event.
     * 
     * @param e - The drag event.
     * 
     * @remarks
     * - Prevents the default behavior of the drag over event, which is necessary to allow
     *   dropping the dragged item in the drop zone.
     */
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
    };

    /**
     * Handles the drop event.
     * 
     * @param e - The drag event.
     * @param team - The team to drop the player on.
     * @param dropIndex - The index to drop the player at.
     */
    const handleDrop = (e: React.DragEvent, team: 'away' | 'home', dropIndex: number) => {
        e.preventDefault();
        e.stopPropagation();
        const draggedTeam = e.dataTransfer.getData('team') as 'away' | 'home';
        const dragIndex = parseInt(e.dataTransfer.getData('index'), 10);

        if (draggedTeam === team) {
            if (dragIndex === dropIndex) return;

            if (team === 'away') {
                const newLineup = [...awayTeamLineup];
                const [draggedPlayer] = newLineup.splice(dragIndex, 1);
                newLineup.splice(dropIndex, 0, draggedPlayer);
                setAwayTeamLineup(newLineup);
            } else {
                const newLineup = [...homeTeamLineup];
                const [draggedPlayer] = newLineup.splice(dragIndex, 1);
                newLineup.splice(dropIndex, 0, draggedPlayer);
                setHomeTeamLineup(newLineup);
            }
        } else {
            // Cross-team drag
            if (draggedTeam === 'away') {
                const newAwayLineup = [...awayTeamLineup];
                const [draggedPlayer] = newAwayLineup.splice(dragIndex, 1);

                // Clear pitcher if necessary
                if (awayPitcher?.id === draggedPlayer.id) setAwayPitcher(null);

                const newHomeLineup = [...homeTeamLineup];
                newHomeLineup.splice(dropIndex, 0, draggedPlayer);

                setAwayTeamLineup(newAwayLineup);
                setHomeTeamLineup(newHomeLineup);
            } else {
                const newHomeLineup = [...homeTeamLineup];
                const [draggedPlayer] = newHomeLineup.splice(dragIndex, 1);

                // Clear pitcher if necessary
                if (homePitcher?.id === draggedPlayer.id) setHomePitcher(null);

                const newAwayLineup = [...awayTeamLineup];
                newAwayLineup.splice(dropIndex, 0, draggedPlayer);

                setHomeTeamLineup(newHomeLineup);
                setAwayTeamLineup(newAwayLineup);
            }
        }
    };

    // Calculate available players dynamically by filtering out anyone already in a lineup
    const availablePlayers = players.filter(p =>
        !awayTeamLineup.some(lp => lp.id === p.id) &&
        !homeTeamLineup.some(lp => lp.id === p.id)
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

        return (
            <div style={{ flex: '1 1 250px' }}>
                <h3 style={{ color: '#9ca3af' }}>{title}</h3>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Lineup</label>
                    <div
                        style={{ minHeight: '150px', backgroundColor: '#374151', borderRadius: '6px', padding: '10px', border: '1px solid #4b5563' }}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, team, lineup.length)}
                    >
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {lineup.map((player, index) => {
                                return (
                                    <li
                                        key={player.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, team, index)}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, team, index)}
                                        style={{
                                            padding: '8px',
                                            marginBottom: '5px',
                                            backgroundColor: '#4b5563',
                                            borderRadius: '4px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            cursor: 'grab'
                                        }}
                                    >
                                        <span style={{ display: 'flex', alignItems: 'center' }}>
                                            <span style={{ color: '#9ca3af', marginRight: '8px', userSelect: 'none' }}>⋮⋮</span>
                                            <span style={{ color: '#9ca3af', marginRight: '10px', width: '20px', display: 'inline-block' }}>{index + 1}.</span>
                                            {`${player.firstName} ${player.lastName}`}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removePlayerFromLineup(team, index)}
                                            style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            X
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>

                        {!isAdding ? (
                            <div style={{ marginTop: lineup.length === 0 ? '45px' : '10px' }}>
                                <div
                                    onClick={() => setIsAdding(true)}
                                    style={{
                                        textAlign: 'center', color: '#9ca3af', fontSize: lineup.length === 0
                                            ? '2.5rem' : '1.2rem', padding: '5px', borderRadius: '4px', transition: 'background-color 0.2s',
                                        cursor: 'pointer',
                                        ...(lineup.length > 0 ? { border: '1px dashed #4b5563' } : {})
                                    }}>
                                    + {lineup.length > 0 && <span style={{ fontSize: '1rem' }}></span>}
                                </div>
                            </div>
                        ) : (
                            <div style={{ marginTop: lineup.length === 0 ? '45px' : '10px' }}>
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
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Starting Pitcher</label>
                    <Select
                        placeholder="Select Pitcher"
                        value={pitcher ? {
                            value: pitcher.id,
                            label: `${pitcher.firstName} ${pitcher.lastName}`
                        } : null}
                        onChange={(selectedOption: any) => {
                            const player = lineup.find(p => p.id === selectedOption?.value);
                            setPitcher(player || null);
                        }}
                        options={lineup.map(p => ({
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
                    disabled={loading}
                    style={{
                        padding: '12px 24px',
                        fontSize: '1.2rem',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                    }}
                >
                    {loading ? "Loading Players..." : "Start a New Game"}
                </button>
                <button
                    onClick={openResumePopup}
                    disabled={loading}
                    style={{
                        padding: '12px 24px',
                        fontSize: '1.2rem',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        backgroundColor: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
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
        </div>
    );
}

export default Home;
