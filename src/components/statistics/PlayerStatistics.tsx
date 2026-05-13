import { useEffect, useState } from "react";
import { playerName, type Player, type PlayerGameData, type statViewTypes } from "../../types";
import fetchAllPlayerStatistics from "../../functions/fetchAllPlayerStatistics";
import BatterStatisticsTableHeader from "./BatterStatisticsTableHeader";
import BatterStatisticsRow from "./BatterStatisticsRow";
import PitcherStatisticsTableHeader from "./PitcherStatisticsTableHeader";
import PitcherStatisticsRow from "./PitcherStatisticsRow";
import HandleStatisticsViewToggle from "./HandleStatisticsViewToggle";

type PlayerStatisticsProps = {
    user: Player;
    onBack: () => void;
};

function PlayerStatistics({ user, onBack }: PlayerStatisticsProps) {
    const [stats, setStats] = useState<PlayerGameData | null>(null);

    const [viewType, setViewType] = useState<statViewTypes>('default');
    
    useEffect(() => {
        fetchAllPlayerStatistics({ players: [user] }).then(data => {
            if (data) setStats(data[0].get(user.id) ?? null);
        });
    }, [user.id]);

    if (!stats) return <h3>Loading...</h3>;

    return (
        <div>
            <button onClick={onBack}>← Back</button>
            <h1>{playerName(user)} Statistics</h1>
            <HandleStatisticsViewToggle viewType={viewType} setViewType={setViewType}/>
            <h3>Batting</h3>
            <table className="stats-table">
                <thead><BatterStatisticsTableHeader viewType={viewType}/></thead>
                <tbody><BatterStatisticsRow viewType={viewType} pde={stats}/></tbody>
            </table>

            <h3>Pitching</h3>
            <table className="stats-table">
                <thead><PitcherStatisticsTableHeader/></thead>
                <tbody><PitcherStatisticsRow pde={stats}/></tbody>
            </table>
        </div>
    );
}

export default PlayerStatistics