import { useState } from 'react';
import { playerName, type Player } from '../types';
import PlayerStatistics from './PlayerStatistics';

type PlayerStatisticsDepotProps = {
    players: Player[];
    onBack: () => void;
};

function PlayerStatisticsDepot({ players, onBack }: PlayerStatisticsDepotProps) {
    const [selectedUser, setSelectedUser] = useState<Player | null>(null);

    if (selectedUser) return <PlayerStatistics user={selectedUser} onBack={() => setSelectedUser(null)} />

    return (
        <div>
            <button onClick={onBack}>← Back</button>
            <h1>Player Statistics</h1>

            <div>
                {players.map(p => (
                    <div key={p.id} onClick={() => setSelectedUser(p)} style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}>
                        {playerName(p)}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default PlayerStatisticsDepot;
