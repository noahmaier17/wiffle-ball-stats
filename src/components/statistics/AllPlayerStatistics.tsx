import { useEffect, useState } from "react";
import fetchAllPlayerStatistics from "../../utils/fetchAllPlayerStatistics";
import { calculateERA, calculateWHIP, playerName, playerNameShort, type Player, type PlayerGameData, type statViewTypes } from "../../types";
import { usePlayers } from "../../contexts/PlayersContext";
import BatterStatisticsRow from "./BatterStatisticsRow";
import BatterStatisticsTableHeader from "./BatterStatisticsTableHeader";
import PitcherStatisticsTableHeader from "./PitcherStatisticsTableHeader";
import PitcherStatisticsRow from "./PitcherStatisticsRow";
import HandleStatisticsViewToggle from "./HandleStatisticsViewToggle";
import HandleStatisticsVersusPositionToggle from "./HandleStatisticsVersusPitcherToggle";
import fetchBattersVersusPitcher from "../../utils/fetchBattersVersusPitcher";
import fetchPitchersVersusBatter from "../../utils/fetchPitchersVersusBatter";

const BATTING_COUNT_COLS = new Set([
    'win', 'loss',
    'at_bats', 'hits', 'singles', 'doubles', 'triples', 'home_runs', 'inside_the_park_home_runs',
    'runs_batted_in', 'walks', 'strikeouts_swinging', 'strikeouts_looking', 'strikeouts', 'tb',
]);

const PITCHING_COUNT_COLS = new Set([
    'innings_pitched', 'batters_faced', 'hits_allowed', 'runs_allowed',
    'pitched_walks', 'pitched_strikeouts_swinging', 'pitched_strikeouts_looking', 'pitched_strikeouts',
]);

function getRawSortValue(stats: PlayerGameData, col: string): number {
    const tb = stats.singles + stats.doubles * 2 + stats.triples * 3 + stats.home_runs * 4;
    switch (col) {
        case 'at_bats': return stats.at_bats;
        case 'plate_appearances': return stats.plate_appearances;
        case 'games_played': return stats.games_played;
        case 'hits': return stats.hits;
        case 'singles': return stats.singles;
        case 'doubles': return stats.doubles;
        case 'triples': return stats.triples;
        case 'home_runs': return stats.home_runs;
        case 'inside_the_park_home_runs': return stats.inside_the_park_home_runs;
        case 'runs_batted_in': return stats.runs_batted_in;
        case 'walks': return stats.walks;
        case 'fielders_choice': return stats.fielders_choice;
        case 'strikeouts_swinging': return stats.strikeouts_swinging;
        case 'strikeouts_looking': return stats.strikeouts_looking;
        case 'strikeouts': return stats.strikeouts;

        case 'ba': return stats.at_bats === 0 ? 0 : stats.hits / stats.at_bats;
        case 'obp': return stats.plate_appearances === 0 ? 0 : (stats.hits + stats.walks) / stats.plate_appearances;
        case 'slg': return stats.at_bats === 0 ? 0 : tb / stats.at_bats;
        case 'ops': return stats.plate_appearances === 0 || stats.at_bats === 0 ? 0 : (stats.hits + stats.walks) / stats.plate_appearances + tb / stats.at_bats;
        case 'tb': return tb;

        case 'win': return stats.win;
        case 'loss': return stats.loss;

        case 'batters_faced': return stats.batters_faced;
        case 'innings_pitched': return stats.innings_pitched;
        case 'games_pitched': return stats.games_pitched;
        case 'earned_runs': return calculateERA(stats);
        case 'walks_plus_hits_per_inning_pitched': return calculateWHIP(stats);
        case 'hits_allowed': return stats.hits_allowed;
        case 'runs_allowed': return stats.runs_allowed;
        case 'pitched_walks': return stats.pitched_walks;
        case 'pitched_strikeouts_swinging': return stats.pitched_strikeouts_swinging;
        case 'pitched_strikeouts_looking': return stats.pitched_strikeouts_looking;
        case 'pitched_strikeouts': return stats.pitched_strikeouts;

        default: return 0;
    }
}

function getSortValue(stats: PlayerGameData, col: string, viewType: statViewTypes): number {
    const raw = getRawSortValue(stats, col);
    if (viewType === 'default') {
        return raw;
    } else if (viewType === 'by_game') {
        // Special handling of innings pitched
        if (col === 'innings_pitched') return (stats.games_pitched === 0) ? 0 : (stats.pitched_outs / stats.games_pitched) / 3;

        // All other columns
        if (BATTING_COUNT_COLS.has(col)) return (stats.games_played === 0) ? 0 : raw / stats.games_played;
        if (PITCHING_COUNT_COLS.has(col)) return (stats.games_pitched === 0) ? 0 : raw / stats.games_pitched;
    } else if (viewType === 'by_AB_and_IP') {
        // We do not alter these columns
        if (['innings_pitched', 'win', 'loss', 'at_bats'].includes(col)) return raw;

        // All other columns
        if (BATTING_COUNT_COLS.has(col)) return (stats.at_bats === 0) ? 0 : raw / stats.at_bats;
        if (PITCHING_COUNT_COLS.has(col)) return (stats.pitched_outs === 0) ? 0 : raw / stats.pitched_outs;
    } else if (viewType === 'by_PA_and_BF') {
        // We do not alter these columns
        if (['plate_appearances', 'win', 'loss', 'batters_faced'].includes(col)) return raw;

        // Special handling of innings pitched
        if (col === 'innings_pitched') return (stats.batters_faced === 0) ? 0 : (stats.pitched_outs / stats.batters_faced) / 3;

        // All other columns
        if (BATTING_COUNT_COLS.has(col)) return (stats.plate_appearances === 0) ? 0 : raw / stats.plate_appearances;
        if (PITCHING_COUNT_COLS.has(col)) return (stats.batters_faced === 0) ? 0 : raw / stats.batters_faced;
    }

    return raw; // Fall through case, often accessed for stats like ERA 
}

type AllPlayerStatisticsProps = {
    onBack: () => void;
}

function AllPlayerStatistics({ onBack }: AllPlayerStatisticsProps) {
    const players = usePlayers();
    // All players stats
    const [allStats, setAllStats] = useState<PlayerGameData[] | null>(null);
    // Stats with filters (like filtering by pitcher) applied
    const [selectedBatterStats, setSelectedBatterStats] = useState<PlayerGameData[] | null>(null);
    const [selectedPitcherStats, setSelectedPitcherStats] = useState<PlayerGameData[] | null>(null);
    // Way to filter out batters and pitchers with all zero statistics
    const [batterIdsWithoutStats, setBatterIdsWithoutStats] = useState<Set<number> | null>(null);
    const [pitcherIdsWithoutStats, setPitcherIdsWithoutStats] = useState<Set<number> | null>(null);

    const [sortedBatterColumn, setSortedBatterColumn] = useState<string | null>(null);
    const [batterSortDirection, setBatterSortDirection] = useState<'asc' | 'desc'>('desc');

    const [sortedPitcherColumn, setSortedPitcherColumn] = useState<string | null>(null);
    const [pitcherSortDirection, setPitcherSortDirection] = useState<'asc' | 'desc'>('desc');

    const [viewType, setViewType] = useState<statViewTypes>('default');
    // If null, that means we are looking at facing against all players
    const [selectedPitcherId, setSelectedPitcherId] = useState<number | null>(null);
    const [selectedBatterId, setSelectedBatterId] = useState<number | null>(null);

    // Fetches player statistics, polling every 5 seconds for updates
    useEffect(() => {
        const fetchStats = async () => {
            // First, we get all the data we have for all players
            const allData = await fetchAllPlayerStatistics({batterIds: players});
            if (allData) {
                setAllStats(Array.from(allData[0].values()));
            }

            // We have 4 variables to set: 
            //  allStats, playerIdsWithoutStats, selectedBatterStats, selectedPitcherStats
            // First, for selecting a pitcher to face:
            if (selectedPitcherId === null) {
                // If we are facing against all pitchers, selectedBatterStats === allStats
                if (allData) {
                    setSelectedBatterStats(Array.from(allData[0].values()));
                    setBatterIdsWithoutStats(allData[1]);
                }
            } else {
                // Here, we need to fetch selectedBatterStats from the fetchBattersVersusPitcher call
                const selectedStatsData = await fetchBattersVersusPitcher({
                    batters: players, 
                    pitchers: players.filter(p => p.id === selectedPitcherId) 
                });
                if (selectedStatsData) {
                    setSelectedBatterStats(Array.from(selectedStatsData[0].values()));
                    setBatterIdsWithoutStats(selectedStatsData[1]);
                }
            }

            // Next, for selecting a batter to face:
            if (selectedBatterId === null) {
                // If we are facing against all pitchers, selectedBatterStats === allStats
                if (allData) {
                    setSelectedPitcherStats(Array.from(allData[0].values()));
                    setPitcherIdsWithoutStats(allData[1]);
                }
            } else {
                // Here, we need to fetch selectedBatterStats from the fetchBattersVersusPitcher call
                const selectedStatsData = await fetchPitchersVersusBatter({
                    batters: players.filter(p => p.id === selectedBatterId),
                    pitchers: players
                });
                if (selectedStatsData) {
                    setSelectedPitcherStats(Array.from(selectedStatsData[0].values()));
                    setPitcherIdsWithoutStats(selectedStatsData[1]);
                }
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, [selectedPitcherId, selectedBatterId]);

    // Handles sorting of tables
    const handleBatterSort = (col: string) => {
        if (col === sortedBatterColumn && batterSortDirection === 'asc') {
            setSortedBatterColumn(null);
        } else if (col === sortedBatterColumn) {
            setBatterSortDirection(d => d === 'desc' ? 'asc' : 'desc');
        } else {
            setSortedBatterColumn(col);
            setBatterSortDirection('desc');
        }
    }
    const handlePitcherSort = (col: string) => {
        if (col === sortedPitcherColumn && pitcherSortDirection === 'asc') {
            setSortedPitcherColumn(null);
        } else if (col === sortedPitcherColumn) {
            setPitcherSortDirection(d => d === 'desc' ? 'asc' : 'desc');
        } else {
            setSortedPitcherColumn(col);
            setPitcherSortDirection('desc');
        }
    }

    // If we don't have our stats yet, returns "Loading..."
    if (!allStats || !selectedBatterStats || !selectedPitcherStats) return <h3>Loading...</h3>

    // Sorts the batters based on our sorting parameter
    const sortedBatterStats = sortedBatterColumn ? [...selectedBatterStats].sort((a, b) => {
        if (sortedBatterColumn === 'name') {
            const nameA = playerName(players.find(p => p.id === a.player_id) ?? { firstName: '', lastName: '' });
            const nameB = playerName(players.find(p => p.id === b.player_id) ?? { firstName: '', lastName: '' });
            return batterSortDirection === 'desc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        }
        const diff = getSortValue(a, sortedBatterColumn, viewType) - getSortValue(b, sortedBatterColumn, viewType);
        return batterSortDirection === 'asc' ? diff : -diff;
    }) : selectedBatterStats;

    // Sorts the pitchers based on our sorting parameter
    const sortedPitcherStats = sortedPitcherColumn ? [...selectedPitcherStats].sort((a, b) => {
        if (sortedPitcherColumn === 'name') {
            const nameA = playerName(players.find(p => p.id === a.player_id) ?? { firstName: '', lastName: '' });
            const nameB = playerName(players.find(p => p.id === b.player_id) ?? { firstName: '', lastName: '' });
            return pitcherSortDirection === 'desc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        }
        const diff = getSortValue(a, sortedPitcherColumn, viewType) - getSortValue(b, sortedPitcherColumn, viewType);
        return pitcherSortDirection === 'asc' ? diff : -diff;
    }) : selectedPitcherStats;

    // Gets a list of all batters who have faced our filtered list of pitchers
    const batterPlayers: Player[] = players
        .filter(p => allStats.some(s => s.player_id === p.id && s.games_played > 0))

    // Creates JSX for every batter from our selected data
    const battingJSX = sortedBatterStats
        .filter(stats => !batterIdsWithoutStats?.has(stats.player_id))
        .map(stats => (
            <BatterStatisticsRow
                key={stats.player_id}
                pde={stats}
                player={players.find(p => p.id === stats.player_id)!}
                viewType={viewType}
            />
        ));

    // Gets a list of all pitchers (people that have pitched > 0 games) from all of the data
    const pitcherPlayers: Player[] = players
        .filter(p => allStats.some(s => s.player_id === p.id && s.games_pitched > 0))

    // Creates JSX for every pitcher that has played in at least 1 game from our selected data
    const pitchingJSX = sortedPitcherStats
        .filter(stats => !pitcherIdsWithoutStats?.has(stats.player_id) && (selectedBatterId !== null || stats.games_pitched > 0))
        .map(stats => (
            <PitcherStatisticsRow
                key={stats.player_id}
                viewType={viewType}
                pde={stats}
                player={players.find(p => p.id === stats.player_id)!}
            />
        ));

    return (
        <div>
            <button onClick={onBack}>← Back</button>
            <h1>All Player Statistics</h1>
            <HandleStatisticsViewToggle
                viewType={viewType}
                setViewType={setViewType}
            />
            <h3>Batting {selectedPitcherId && ` facing ${players.filter(p => p.id === selectedPitcherId).map(p => playerNameShort(p))}`}</h3>
            <HandleStatisticsVersusPositionToggle 
                allPitcherIds={pitcherPlayers}
                selectedPitcherId={selectedPitcherId}
                setSelectedPitcherId={setSelectedPitcherId}
                isVerusBatter={false}
            />
            <br/>
            <div className="table-scroll-container">
                <table className="stats-table sticky-first-col">
                    <thead>
                        <BatterStatisticsTableHeader
                            setSortedColumn={handleBatterSort}
                            sortedColumn={sortedBatterColumn}
                            sortDirection={batterSortDirection}
                            showName={true}
                            viewType={viewType}
                        />
                    </thead>
                    <tbody>{battingJSX}</tbody>
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
                <table className="stats-table sticky-first-col">
                    <thead>
                        <PitcherStatisticsTableHeader
                            viewType={viewType}
                            setSortedColumn={handlePitcherSort}
                            sortedColumn={sortedPitcherColumn}
                            sortDirection={pitcherSortDirection}
                            showName={true}
                        />
                    </thead>
                    <tbody>{pitchingJSX}</tbody>
                </table>
            </div>
        </div>
    );
}

export default AllPlayerStatistics