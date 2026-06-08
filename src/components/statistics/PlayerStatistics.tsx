import { useEffect, useState } from "react";
import { playerName, type Player, type PlayerGameData, type statViewTypes } from "../../types";
import { useStatsData } from "../../contexts/StatsDataContext";
import { computeAllPlayerStatistics } from "../../utils/computeAllPlayerStatistics";
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

    // Pull cached data from StatsDataContext — no direct DB calls or local polling here.
    // playerGameStats updates automatically every 30 seconds from the context.
    const { playerGameStats, isLoading } = useStatsData();

    // Recompute this player's stats whenever the context data refreshes
    useEffect(() => {
        if (isLoading) return;
        const [statsMap] = computeAllPlayerStatistics(playerGameStats, { batterIds: [user] });
        setStats(statsMap.get(user.id) ?? null);
    }, [playerGameStats, user.id, isLoading]);

    // Shows loading if context hasn't delivered data yet
    if (isLoading || !stats) return <h3>Loading...</h3>;

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
