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
        fetchAllPlayerStatistics().then(data => {
            if (data) setStats(data.get(user.id) ?? null);
        });
    }, [user.id]);

    if (!stats) return <></>;

    /* const {
        innings_pitched, pitched_strikeouts, pitched_walks, hits_allowed, runs_allowed
    } = stats; */

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
                <tbody><PitcherStatisticsRow pde={stats}/>
                    {/*<tr>
                        <td>{innings_pitched.toFixed(1)}</td>
                        <td>{pitched_strikeouts}</td>
                        <td>{pitched_walks}</td>
                        <td>{hits_allowed}</td>
                        <td>{runs_allowed}</td>
                    </tr>*/}
                </tbody>
            </table>
        </div>
    );
}

export default PlayerStatistics