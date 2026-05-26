import { useEffect, useState } from "react";
import fetchAllPlayerStatistics from "../../utils/fetchAllPlayerStatistics";
import { calculateERA, calculateWHIP, playerName, type PlayerGameData, type statViewTypes } from "../../types";
import { usePlayers } from "../../contexts/PlayersContext";
import BatterStatisticsRow from "./BatterStatisticsRow";
import BatterStatisticsTableHeader from "./BatterStatisticsTableHeader";
import PitcherStatisticsTableHeader from "./PitcherStatisticsTableHeader";
import PitcherStatisticsRow from "./PitcherStatisticsRow";
import HandleStatisticsViewToggle from "./HandleStatisticsViewToggle";

const BATTING_COUNT_COLS = new Set([
    'win', 'loss',
    'at_bats', 'hits', 'singles', 'doubles', 'triples', 'home_runs', 'inside_the_park_home_runs',
    'runs_batted_in', 'walks', 'strikeouts_swinging', 'strikeouts_looking', 'strikeouts', 'tb',
]);

const PITCHING_COUNT_COLS = new Set([
    'innings_pitched', 'hits_allowed', 'runs_allowed',
    'pitched_walks', 'pitched_strikeouts_swinging', 'pitched_strikeouts_looking', 'pitched_strikeouts',
]);

function getRawSortValue(stats: PlayerGameData, col: string): number {
    const tb = stats.singles + stats.doubles * 2 + stats.triples * 3 + stats.home_runs * 4;
    switch (col) {
        case 'at_bats': return stats.at_bats;
        case 'games_played': return stats.games_played;
        case 'hits': return stats.hits;
        case 'singles': return stats.singles;
        case 'doubles': return stats.doubles;
        case 'triples': return stats.triples;
        case 'home_runs': return stats.home_runs;
        case 'inside_the_park_home_runs': return stats.inside_the_park_home_runs;
        case 'runs_batted_in': return stats.runs_batted_in;
        case 'walks': return stats.walks;
        case 'strikeouts_swinging': return stats.strikeouts_swinging;
        case 'strikeouts_looking': return stats.strikeouts_looking;
        case 'strikeouts': return stats.strikeouts;

        case 'ba': return stats.hits / stats.at_bats;
        case 'obp': return (stats.hits + stats.walks) / stats.plate_appearances;
        case 'slg': return tb / stats.at_bats;
        case 'ops': return (stats.hits + stats.walks) / stats.plate_appearances + tb / stats.at_bats;
        case 'tb': return tb;

        case 'win': return stats.win;
        case 'loss': return stats.loss;

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
    if (viewType === 'default') return raw;
    if (col === 'innings_pitched') return (stats.games_pitched === 0) ? 0 : (stats.pitched_outs / stats.games_pitched) / 3;

    if (BATTING_COUNT_COLS.has(col)) return (stats.games_played === 0) ? 0 : raw / stats.games_played;
    if (PITCHING_COUNT_COLS.has(col)) return (stats.games_pitched === 0) ? 0 : raw / stats.games_pitched;

    return raw; // Cannot be accessed
}

type AllPlayerStatisticsProps = {
    onBack: () => void;
}

function AllPlayerStatistics({ onBack }: AllPlayerStatisticsProps) {
    const players = usePlayers();
    const [allStats, setAllStats] = useState<PlayerGameData[] | null>(null);
    const [playerIdsWithoutStats, setPlayerIdsWithoutStats] = useState<Set<number> | null>(null);

    const [sortedBatterColumn, setSortedBatterColumn] = useState<string | null>(null);
    const [batterSortDirection, setBatterSortDirection] = useState<'asc' | 'desc'>('desc');

    const [sortedPitcherColumn, setSortedPitcherColumn] = useState<string | null>(null);
    const [pitcherSortDirection, setPitcherSortDirection] = useState<'asc' | 'desc'>('desc');

    const [viewType, setViewType] = useState<statViewTypes>('default');

    // Fetches player statistics, polling every 5 seconds for updates
    useEffect(() => {
        const fetchStats = () => {
            fetchAllPlayerStatistics({players}).then(data => {
                if (data) {
                    setAllStats(Array.from(data[0].values()));
                    setPlayerIdsWithoutStats(data[1]);
                }
            });
        };

        fetchStats();
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, []);

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
    if (!allStats) return <h3>Loading...</h3>

    // Sorts the batters based on our sorting parameter
    const sortedBatterStats = sortedBatterColumn ? [...allStats].sort((a, b) => {
        if (sortedBatterColumn === 'name') {
            const nameA = playerName(players.find(p => p.id === a.player_id) ?? { firstName: '', lastName: '' });
            const nameB = playerName(players.find(p => p.id === b.player_id) ?? { firstName: '', lastName: '' });
            return batterSortDirection === 'desc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        }
        const diff = getSortValue(a, sortedBatterColumn, viewType) - getSortValue(b, sortedBatterColumn, viewType);
        return batterSortDirection === 'asc' ? diff : -diff;
    }) : allStats;

    // Sorts the pitchers based on our sorting parameter
    const sortedPitcherStats = sortedPitcherColumn ? [...allStats].sort((a, b) => {
        if (sortedPitcherColumn === 'name') {
            const nameA = playerName(players.find(p => p.id === a.player_id) ?? { firstName: '', lastName: '' });
            const nameB = playerName(players.find(p => p.id === b.player_id) ?? { firstName: '', lastName: '' });
            return pitcherSortDirection === 'desc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        }
        const diff = getSortValue(a, sortedPitcherColumn, viewType) - getSortValue(b, sortedPitcherColumn, viewType);
        return pitcherSortDirection === 'asc' ? diff : -diff;
    }) : allStats;

    // Creates JSX for every batter
    const battingJSX = sortedBatterStats
        .filter(stats => {
            const player = players.find(p => p.id === stats.player_id);
            return player && !playerIdsWithoutStats?.has(player.id);
        })
        .map(stats => (
            <BatterStatisticsRow
                key={stats.player_id}
                pde={stats}
                player={players.find(p => p.id === stats.player_id)!}
                viewType={viewType}
            />
        ));

    // Creates JSX for every pitcher
    const pitchingJSX = sortedPitcherStats
        .filter(stats => {
            const player = players.find(p => p.id === stats.player_id);
            return player && !playerIdsWithoutStats?.has(player.id) && stats.games_pitched > 0;
        })
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
            <h3>Batting</h3>
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

            <h3>Pitching</h3>
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