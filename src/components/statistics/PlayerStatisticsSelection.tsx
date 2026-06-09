import { useEffect, useRef, useState } from 'react';
import { playerName, type Player } from '../../types';
import { usePlayers } from '../../contexts/PlayersContext';
import PlayerStatistics from './PlayerStatistics';
import AllPlayerStatistics from './AllPlayerStatistics';

const playerToSlug = (p: Player) => `${p.firstName}_${p.lastName}`.toLowerCase();

type PlayerStatisticsSelectionProps = {
    onBack: () => void;
    initialPlayerSlug?: string | null;
};

function PlayerStatisticsSelection({ onBack, initialPlayerSlug }: PlayerStatisticsSelectionProps) {
    const players = usePlayers();
    const [selectedUser, setSelectedUser] = useState<Player | null>(null);
    const [showAllUsers, setShowAllUsers] = useState<boolean>(false);
    const initialResolved = useRef(false);

    // Resolve the initial slug once players are available
    useEffect(() => {
        if (!initialPlayerSlug || initialResolved.current || players.length === 0) return;
        const match = players.find(p => playerToSlug(p) === initialPlayerSlug);
        if (match) {
            history.replaceState(null, '', `#statistics/${initialPlayerSlug}`);
            setSelectedUser(match);
        }
        initialResolved.current = true;
    }, [players, initialPlayerSlug]);

    const handleSelectPlayer = (p: Player) => {
        history.replaceState(null, '', `#statistics/${playerToSlug(p)}`);
        setSelectedUser(p);
    };

    const handleBackFromPlayer = () => {
        history.replaceState(null, '', '#statistics');
        setSelectedUser(null);
    };

    if (selectedUser) return <PlayerStatistics user={selectedUser} onBack={handleBackFromPlayer} />
    if (showAllUsers) return <AllPlayerStatistics onBack={() => setShowAllUsers(false)} />

    return (
        <div>
            <button onClick={onBack}>← Back</button>
            <h1>Player Statistics</h1>

            <div>
                <button key={"all button"} onClick={() => setShowAllUsers(true)} className="radio-group">Show All</button>
                <hr></hr>
                {players.map(p => (
                    <button key={p.id} onClick={() => handleSelectPlayer(p)} className="radio-group">
                        {playerName(p)}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default PlayerStatisticsSelection;
