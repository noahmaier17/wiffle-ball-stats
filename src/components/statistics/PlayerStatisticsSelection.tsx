import { useState } from 'react';
import { playerName, type Player } from '../../types';
import { usePlayers } from '../../contexts/PlayersContext';
import PlayerStatistics from './PlayerStatistics';
import AllPlayerStatistics from './AllPlayerStatistics';

type PlayerStatisticsSelectionProps = {
    onBack: () => void;
};

function PlayerStatisticsSelection({ onBack }: PlayerStatisticsSelectionProps) {
    const players = usePlayers();
    const [selectedUser, setSelectedUser] = useState<Player | null>(null);
    const [showAllUsers, setShowAllUsers] = useState<boolean>(false);

    if (selectedUser) return <PlayerStatistics user={selectedUser} onBack={() => setSelectedUser(null)} />
    if (showAllUsers) return <AllPlayerStatistics onBack={() => setShowAllUsers(false)} />

    return (
        <div>
            <button onClick={onBack}>← Back</button>
            <h1>Player Statistics</h1>

            <div>
                <button key={"all button"} onClick={() => setShowAllUsers(true)} className="radio-group">Show All</button>
                <hr></hr>
                {players.map(p => (
                    <button key={p.id} onClick={() => setSelectedUser(p)} className="radio-group">
                        {playerName(p)}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default PlayerStatisticsSelection;
