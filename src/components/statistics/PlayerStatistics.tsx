import { useEffect, useState } from "react";
import { playerName, type Player, type PlayerGameData } from "../../types";
import fetchAllPlayerStatistics from "../../functions/fetchAllPlayerStatistics";
import BatterStatisticsTableHeader from "./BatterStatisticsTableHeader";
import BatterStatisticsRow from "./BatterStatisticsRow";

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

    const {
        plate_appearances, at_bats, hits, singles, doubles, triples,
        home_runs, inside_the_park_home_runs, runs_batted_in, walks, strikeouts,
        innings_pitched, pitched_strikeouts, pitched_walks, hits_allowed, runs_allowed
    } = stats;

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
                <thead>
                    <tr>
                        <th>IP</th><th>K</th><th>BB</th><th>H</th><th>R</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>{innings_pitched.toFixed(1)}</td>
                        <td>{pitched_strikeouts}</td>
                        <td>{pitched_walks}</td>
                        <td>{hits_allowed}</td>
                        <td>{runs_allowed}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

export default PlayerStatistics