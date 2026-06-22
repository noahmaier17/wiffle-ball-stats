import { useState } from "react";
import { playerName, playerNameShort, type Park, type Player, type statViewTypes } from "../../types";
import { useStatsData } from "../../contexts/StatsDataContext";
import { usePlayers } from "../../contexts/PlayersContext";
import { useComputedStats } from "../../hooks/useComputedStats";
import BatterStatisticsTableHeader from "./BatterStatisticsTableHeader";
import BatterStatisticsRow from "./BatterStatisticsRow";
import PitcherStatisticsTableHeader from "./PitcherStatisticsTableHeader";
import PitcherStatisticsRow from "./PitcherStatisticsRow";
import HandleStatisticsViewToggle from "./HandleStatisticsViewToggle";
import PlayersPlayByPlay from "./PlayersPlayByPlay";
import { PARKS } from "../../constants";
import FilterPanel from "./FilterPanel";
import ParkAndFielderFilters from "./ParkAndFielderFilters";
import GameFilter from "./GameFilter";
import HandleStatisticsVersusPositionToggle from "./HandleStatisticsVersusPitcherToggle";

type PlayerStatisticsProps = {
    user: Player;
    onBack: () => void;
};

function PlayerStatistics({ user, onBack }: PlayerStatisticsProps) {
    // Fetches list of players
    const players = usePlayers();

    // Pull cached data from StatsDataContext (games + isLoading used directly in this component)
    const { games, isLoading } = useStatsData();

    // Changes the type of statistics viewing we have
    const [viewType, setViewType] = useState<statViewTypes>('default');

    // Filters for the statistics
    const [selectedParks, setSelectedParks] = useState<Set<Park>>(new Set(PARKS));
    const [selectedFielderCounts, setSelectedFielderCounts] = useState<Set<number>>(new Set([3]));
    const [selectedGameIds, setSelectedGameIds] = useState<Set<number> | null>(null);

    // If null, we are showing stats against all pitchers / batters
    const [selectedPitcherId, setSelectedPitcherId] = useState<number | null>(null);
    const [selectedBatterId, setSelectedBatterId] = useState<number | null>(null);


    // Hook to set these variables
    const { allStats, selectedBatterStats, selectedPitcherStats, atBatLogsByGame } = useComputedStats({
        selectedParks, selectedFielderCounts, selectedGameIds, selectedPitcherId, selectedBatterId
    });

    // Stats of this user, derived from allStats
    const stats = allStats?.find(p => p.player_id === user.id) ?? null;

    // Shows loading if context hasn't delivered data yet
    if (isLoading || !stats || !allStats || !selectedBatterStats || !selectedPitcherStats || !atBatLogsByGame) return <h3>Loading...</h3>;

    // Filtered stats for batting/pitching tables (respects vs-pitcher / vs-batter selection)
    const batterStats = selectedBatterStats.find(p => p.player_id === user.id) ?? stats;
    const pitcherStats = selectedPitcherStats.find(p => p.player_id === user.id) ?? stats;

    // Gets a list of all pitchers (people that have pitched > 0 games) from all of the data
    const pitcherPlayers: Player[] = players
        .filter(p => allStats.some(s => s.player_id === p.id && s.games_pitched > 0));

    // Gets a list of all batters who have faced our filtered list of pitchers
    const batterPlayers: Player[] = players
        .filter(p => allStats.some(s => s.player_id === p.id && s.games_played > 0));

    return (
        <div>
            <button onClick={onBack}>← Back</button>
            <h1>{playerName(user)} Statistics</h1>
            <FilterPanel viewType={viewType} selectedParks={selectedParks} selectedFielderCounts={selectedFielderCounts} selectedGameIds={selectedGameIds}>
                <HandleStatisticsViewToggle
                    viewType={viewType}
                    setViewType={setViewType}
                />
                <ParkAndFielderFilters
                    selectedParks={selectedParks}
                    setSelectedParks={setSelectedParks}
                    selectedFielderCounts={selectedFielderCounts}
                    setSelectedFielderCounts={setSelectedFielderCounts}
                />
                <GameFilter
                    games={games}
                    selectedGameIds={selectedGameIds}
                    setSelectedGameIds={setSelectedGameIds}
                />
            </FilterPanel>
            <h3>Batting {selectedPitcherId && ` facing ${players.filter(p => p.id === selectedPitcherId).map(p => playerNameShort(p))}`}</h3>
            <HandleStatisticsVersusPositionToggle
                allPitcherIds={pitcherPlayers}
                selectedPitcherId={selectedPitcherId}
                setSelectedPitcherId={setSelectedPitcherId}
                isVerusBatter={false}
            />
            <br/>
            <div className="table-scroll-container">
                <table className="stats-table">
                    <thead><BatterStatisticsTableHeader viewType={viewType}/></thead>
                    <tbody><BatterStatisticsRow viewType={viewType} pde={batterStats}/></tbody>
                </table>
            </div>

            <h3>Pitching {selectedBatterId && ` facing ${players.filter(p => p.id === selectedBatterId).map(p => playerNameShort(p))}`}</h3>
            <HandleStatisticsVersusPositionToggle
                allPitcherIds={batterPlayers}
                selectedPitcherId={selectedBatterId}
                setSelectedPitcherId={setSelectedBatterId}
                isVerusBatter={true}
            />
            <br/>
            <div className="table-scroll-container">
                <table className="stats-table">
                    <thead><PitcherStatisticsTableHeader viewType={viewType}/></thead>
                    <tbody><PitcherStatisticsRow viewType={viewType} pde={pitcherStats}/></tbody>
                </table>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <PlayersPlayByPlay player={user} forBatting={true} atBatLogsByGame={atBatLogsByGame}/>
                <PlayersPlayByPlay player={user} forBatting={false} atBatLogsByGame={atBatLogsByGame}/>
            </div>
        </div>
    );
}

export default PlayerStatistics
