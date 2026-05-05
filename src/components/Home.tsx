import { useState, useEffect } from 'react';
import { supabase } from '../supabase-client';

type Player = {
    id: number;
    firstName: string;
    lastName: string;
};

type HomeProps = {
    onStartGame: (gameData: any) => void;
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
function Home({ onStartGame }: HomeProps) {
    const [players, setPlayers] = useState<Player[]>([]);
    const [showPopup, setShowPopup] = useState(false);
    const [loading, setLoading] = useState(true);

    // Lineup state
    const [awayTeamLineup, setAwayTeamLineup] = useState<number[]>([]);
    const [homeTeamLineup, setHomeTeamLineup] = useState<number[]>([]);
    const [awayPitcher, setAwayPitcher] = useState<number | ''>('');
    const [homePitcher, setHomePitcher] = useState<number | ''>('');

    const [lineupError, setLineupError] = useState<string | null>(null);

    useEffect(() => {
        fetchPlayers();
    }, []);

    /**
     * Fetches the list of players from the Supabase database.
     * 
     * @remarks
     * - Queries the 'players' table in Supabase.
     * - Maps the database records to the local `Player` type.
     * - Updates the `players` state with the fetched data.
     * - Handles loading and error states, updating the `loading` and `lineupError` states accordingly.
     */
    const fetchPlayers = async () => {
        setLoading(true);

        // Fetch from supabase 'players' table
        const { data, error } = await supabase.from('players').select('id, first_name, last_name');

        if (error) {
            console.error("Error fetching players:", error);
        } else if (data) {
            const mappedData = data.map((p: any) => ({
                id: p.id,
                firstName: p.first_name,
                lastName: p.last_name
            }));
            setPlayers(mappedData);
        }
        setLoading(false);
    };

    /**
     * Initiates the game setup process.
     * 
     * @remarks
     * - Displays the game setup modal/popup, allowing the user to configure lineups.
     * - This function is typically triggered by a user action, such as clicking a "Start Game" button.
     */
    const startGame = () => {
        setShowPopup(true);
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
    const handleStartGameSubmit = (e: React.SyntheticEvent) => {
        e.preventDefault();
        onStartGame({
            awayTeamLineup,
            homeTeamLineup,
            awayPitcher,
            homePitcher,
            players
        });
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
    const addPlayerToLineup = (team: 'away' | 'home', playerId: number) => {
        setLineupError(null);
        if (team === 'away') {
            if (homeTeamLineup.includes(playerId)) {
                const player = players.find(p => p.id === playerId);
                setLineupError(`${player?.firstName} ${player?.lastName} is already in the Home lineup.`);
                return;
            }
            if (!awayTeamLineup.includes(playerId)) setAwayTeamLineup([...awayTeamLineup, playerId]);
        } else {
            if (awayTeamLineup.includes(playerId)) {
                const player = players.find(p => p.id === playerId);
                setLineupError(`${player?.firstName} ${player?.lastName} is already in the Away lineup.`);
                return;
            }
            if (!homeTeamLineup.includes(playerId)) setHomeTeamLineup([...homeTeamLineup, playerId]);
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
            const removedPlayerId = awayTeamLineup[index];
            if (awayPitcher === removedPlayerId) setAwayPitcher('');
            setAwayTeamLineup(prev => prev.filter((_, i) => i !== index));
        } else {
            const removedPlayerId = homeTeamLineup[index];
            if (homePitcher === removedPlayerId) setHomePitcher('');
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
     * @param team - The team the item is being dropped onto ('away' or 'home').
     * @param dropIndex - The index in the lineup where the item is being dropped.
     * 
     * @remarks
     * - Prevents the default form submission behavior.
     * - Retrieves the `team` and `index` from the event's data transfer object.
     * - If the dragged item is from a different team, it does nothing.
     * - If the dragged item is dropped on itself (same index), it does nothing.
     * - Otherwise, it swaps the position of the dragged player in the lineup.
     * - Updates the state of the relevant team's lineup.
     */
    const handleDrop = (e: React.DragEvent, team: 'away' | 'home', dropIndex: number) => {
        e.preventDefault();
        const draggedTeam = e.dataTransfer.getData('team');
        if (draggedTeam !== team) return;

        const dragIndex = parseInt(e.dataTransfer.getData('index'), 10);
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
    };

    return (
        <div className="home-container" style={{ padding: '2rem', textAlign: 'center' }}>
            <h1>Wiffle Ball Stats</h1>
            <p>Welcome to the Wiffle Ball Stat Tracker!</p>

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
                    marginTop: '20px'
                }}
            >
                {loading ? "Loading Players..." : "Start a New Game"}
            </button>

            {showPopup && (
                <div className="popup-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
                    justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div className="popup-content" style={{
                        backgroundColor: '#1f2937', padding: '30px', borderRadius: '12px',
                        maxHeight: '90vh', overflowY: 'auto', border: '1px solid #374151',
                        minWidth: '700px', color: 'white', textAlign: 'left',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                    }}>
                        <h2 style={{ marginTop: 0, textAlign: 'center', borderBottom: '1px solid #374151', paddingBottom: '15px' }}>
                            Set Lineups
                        </h2>

                        {lineupError && (
                            <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '6px', marginBottom: '15px', textAlign: 'center' }}>
                                {lineupError}
                            </div>
                        )}

                        <form onSubmit={handleStartGameSubmit}>
                            <div style={{ display: 'flex', gap: '40px', marginTop: '20px' }}>

                                {/* Away Team */}
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ color: '#9ca3af' }}>Away Team</h3>

                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Lineup</label>
                                        <div style={{ minHeight: '150px', backgroundColor: '#374151', borderRadius: '6px', padding: '10px', border: '1px solid #4b5563' }}>
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                {awayTeamLineup.map((playerId, index) => {
                                                    const player = players.find(p => p.id === playerId);
                                                    return (
                                                        <li
                                                            key={playerId}
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, 'away', index)}
                                                            onDragOver={handleDragOver}
                                                            onDrop={(e) => handleDrop(e, 'away', index)}
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
                                                                {player ? `${player.firstName} ${player.lastName}` : 'Unknown'}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => removePlayerFromLineup('away', index)}
                                                                style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontWeight: 'bold' }}
                                                            >
                                                                X
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>

                                            <div style={{ position: 'relative', marginTop: awayTeamLineup.length === 0 ? '45px' : '10px' }}>
                                                <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: awayTeamLineup.length === 0 ? '2.5rem' : '1.2rem', padding: '5px', borderRadius: '4px', transition: 'background-color 0.2s', ...(awayTeamLineup.length > 0 ? { border: '1px dashed #4b5563' } : {}) }}>
                                                    + {awayTeamLineup.length > 0 && <span style={{ fontSize: '1rem' }}></span>}
                                                </div>
                                                <select
                                                    value=""
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            addPlayerToLineup('away', Number(e.target.value));
                                                        }
                                                    }}
                                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                                >
                                                    <option value="" disabled>Select Player...</option>
                                                    {players.filter(p => !awayTeamLineup.includes(p.id)).map(p => (
                                                        <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Starting Pitcher</label>
                                        <select
                                            value={awayPitcher}
                                            onChange={(e) => setAwayPitcher(Number(e.target.value))}
                                            required
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#374151', color: 'white', border: '1px solid #4b5563' }}
                                        >
                                            <option value="" disabled>Select Pitcher</option>
                                            {players.filter(p => awayTeamLineup.includes(p.id)).map(p => (
                                                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Home Team */}
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ color: '#9ca3af' }}>Home Team</h3>

                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Lineup</label>
                                        <div style={{ minHeight: '150px', backgroundColor: '#374151', borderRadius: '6px', padding: '10px', border: '1px solid #4b5563' }}>
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                {homeTeamLineup.map((playerId, index) => {
                                                    const player = players.find(p => p.id === playerId);
                                                    return (
                                                        <li
                                                            key={playerId}
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, 'home', index)}
                                                            onDragOver={handleDragOver}
                                                            onDrop={(e) => handleDrop(e, 'home', index)}
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
                                                                {player ? `${player.firstName} ${player.lastName}` : 'Unknown'}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => removePlayerFromLineup('home', index)}
                                                                style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontWeight: 'bold' }}
                                                            >
                                                                X
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>

                                            <div style={{ position: 'relative', marginTop: homeTeamLineup.length === 0 ? '45px' : '10px' }}>
                                                <div style={{
                                                    textAlign: 'center', color: '#9ca3af', fontSize: homeTeamLineup.length === 0
                                                        ? '2.5rem' : '1.2rem', padding: '5px', borderRadius: '4px', transition: 'background-color 0.2s',
                                                    ...(homeTeamLineup.length > 0 ? { border: '1px dashed #4b5563' } : {})
                                                }}>
                                                    + {homeTeamLineup.length > 0 && <span style={{ fontSize: '1rem' }}>Add Player</span>}
                                                </div>
                                                <select
                                                    value=""
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            addPlayerToLineup('home', Number(e.target.value));
                                                        }
                                                    }}
                                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                                >
                                                    <option value="" disabled>Select Player...</option>
                                                    {players.filter(p => !homeTeamLineup.includes(p.id)).map(p => (
                                                        <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Starting Pitcher</label>
                                        <select
                                            value={homePitcher}
                                            onChange={(e) => setHomePitcher(Number(e.target.value))}
                                            required
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#374151', color: 'white', border: '1px solid #4b5563' }}
                                        >
                                            <option value="" disabled>Select Pitcher</option>
                                            {players.filter(p => homeTeamLineup.includes(p.id)).map(p => (
                                                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                            </div>

                            <div style={{ marginTop: '35px', display: 'flex', justifyContent: 'flex-end', gap: '15px', borderTop: '1px solid #374151', paddingTop: '20px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowPopup(false)}
                                    style={{ padding: '10px 20px', backgroundColor: '#4b5563', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Play Ball!
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
