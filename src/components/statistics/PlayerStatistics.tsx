import { useEffect, useState } from "react";
import { playerName, type Player, type PlayerGameData, type statViewTypes } from "../../types";
import fetchAllPlayerStatistics from "../../utils/fetchAllPlayerStatistics";
import BatterStatisticsTableHeader from "./BatterStatisticsTableHeader";
import BatterStatisticsRow from "./BatterStatisticsRow";
import PitcherStatisticsTableHeader from "./PitcherStatisticsTableHeader";
import PitcherStatisticsRow from "./PitcherStatisticsRow";
import HandleStatisticsViewToggle from "./HandleStatisticsViewToggle";
import PlayersPlayByPlay from "./PlayersPlayByPlay";

type PlayerStatisticsProps = {
    user: Player;
    onBack: () => void;
};

function PlayerStatistics({ user, onBack }: PlayerStatisticsProps) {
    const [stats, setStats] = useState<PlayerGameData | null>(null);

    const [viewType, setViewType] = useState<statViewTypes>('default');

    // const [selectedPitcherId, setSelectedPitcherId] = useState<number | null>(null);
    
    // Fet5ches the stats for this player
    useEffect(() => {
        const fetchStats = () => {
            fetchAllPlayerStatistics({ batterIds: [user] }).then(data => {
                if (data) setStats(data[0].get(user.id) ?? null);
            });
        };

        fetchStats();
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, [user.id]);

    // Shows loading if not yet fetched
    if (!stats) return <h3>Loading...</h3>;

    return (
        <div>
            <button onClick={onBack}>← Back</button>
            <h1>{playerName(user)} Statistics</h1>
            <HandleStatisticsViewToggle viewType={viewType} setViewType={setViewType}/>
            <h3>Batting</h3>
            <div className="table-scroll-container">
                <table className="stats-table">
                    <thead><BatterStatisticsTableHeader viewType={viewType}/></thead>
                    <tbody><BatterStatisticsRow viewType={viewType} pde={stats}/></tbody>
                </table>
            </div>

            <h3>Pitching</h3>
            <div className="table-scroll-container">
                <table className="stats-table">
                    <thead><PitcherStatisticsTableHeader viewType={viewType}/></thead>
                    <tbody><PitcherStatisticsRow viewType={viewType} pde={stats}/></tbody>
                </table>
            </div>

            <h3>Batter Play by Play</h3>
            <PlayersPlayByPlay player={user} forBatting={true}/>

            <h3>Pitcher Play by Play</h3>
            <PlayersPlayByPlay player={user} forBatting={false}/>
        </div>
    );
}

export default PlayerStatistics