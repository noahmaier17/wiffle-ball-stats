import { useState } from 'react';
import { playerName, type Player } from '../../types';
import PlayerStatistics from './PlayerStatistics';
import AllPlayerStatistics from './AllPlayerStatistics';

type PlayerStatisticsDepotProps = {
    players: Player[];
    onBack: () => void;
};

function PlayerStatisticsDepot({ players, onBack }: PlayerStatisticsDepotProps) {
    const [selectedUser, setSelectedUser] = useState<Player | null>(null);
    const [showAllUsers, setShowAllUsers] = useState<boolean>(false);

    if (selectedUser) return <PlayerStatistics user={selectedUser} onBack={() => setSelectedUser(null)} />
    if (showAllUsers) return <AllPlayerStatistics players={players} onBack={() => setShowAllUsers(false)} />

    return (
        <div>
            <button onClick={onBack}>← Back</button>
            <h1>Player Statistics</h1>

            <div>
                <button key={"all button"} onClick={() => setShowAllUsers(true)}>Show All</button>
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

export default PlayerStatisticsDepot;
