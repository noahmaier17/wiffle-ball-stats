import { useEffect, useState } from "react";
import { playerName, type Player, type PlayerGameData } from "../../types";
import fetchAllPlayerStatistics from "../../functions/fetchAllPlayerStatistics";
import BatterStatisticsTableHeader from "./BatterStatisticsTableHeader";
import BatterStatisticsRow from "./BatterStatisticsRow";
import PitcherStatisticsTableHeader from "./PitcherStatisticsTableHeader";
import PitcherStatisticsRow from "./PitcherStatisticsRow";

type PlayerStatisticsProps = {
    user: Player;
    onBack: () => void;
};

function PlayerStatistics({ user, onBack }: PlayerStatisticsProps) {
    const [stats, setStats] = useState<PlayerGameData | null>(null);

    useEffect(() => {
        fetchAllPlayerStatistics({ players: [user] }).then(data => {
            if (data) setStats(data[0].get(user.id) ?? null);
        });
    }, [user.id]);

    if (!stats) return <></>;

    return (
        <div>
            <button onClick={onBack}>← Back</button>
            <h1>{playerName(user)} Statistics</h1>
            <h3>Batting</h3>
            <table className="stats-table">
                <thead><BatterStatisticsTableHeader/></thead>
                <tbody><BatterStatisticsRow pde={stats}/></tbody>
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