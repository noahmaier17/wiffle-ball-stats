import { useEffect, useState, type JSX } from "react";
import fetchAllPlayerStatistics from "../../functions/fetchAllPlayerStatistics";
import { playerName, type Player, type PlayerGameData } from "../../types";
import BatterStatisticsRow from "./BatterStatisticsRow";
import BatterStatisticsTableHeader from "./BatterStatisticsTableHeader";

function getSortValue(stats: PlayerGameData, col: string): number {
    const tb = stats.singles + stats.doubles * 2 + stats.triples * 3 + stats.home_runs * 4;
    switch (col) {
        case 'at_bats': return stats.at_bats;
        case 'hits': return stats.hits;
        case 'singles': return stats.singles;
        case 'doubles': return stats.doubles;
        case 'triples': return stats.triples;
        case 'home_runs': return stats.home_runs;
        case 'inside_the_park_home_runs': return stats.inside_the_park_home_runs;
        case 'runs_batted_in': return stats.runs_batted_in;
        case 'walks': return stats.walks;
        case 'strikeouts': return stats.strikeouts;
        case 'ba': return stats.hits / stats.at_bats;
        case 'obp': return (stats.hits + stats.walks) / stats.plate_appearances;
        case 'slg': return tb / stats.at_bats;
        case 'ops': return (stats.hits + stats.walks) / stats.plate_appearances + tb / stats.at_bats;
        case 'tb': return tb;
        default: return 0;
    }
}

type AllPlayerStatisticsProps = {
    players: Player[];
    onBack: () => void;
}

function AllPlayerStatistics({ players, onBack }: AllPlayerStatisticsProps) {
    const [allStats, setAllStats] = useState<PlayerGameData[] | null>(null);
    const [sortedColumn, setSortedColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        fetchAllPlayerStatistics().then(data => {
            if (data) setAllStats(Array.from(data.values()));
        });
    }, []);

    if (!allStats) return <></>;

    const handleSort = (col: string) => {
        if (col === sortedColumn) {
            setSortDirection(d => d === 'desc' ? 'asc' : 'desc');
        } else {
            setSortedColumn(col);
            setSortDirection('desc');
        }
    };

    const sortedStats = sortedColumn ? [...allStats].sort((a, b) => {
        if (sortedColumn === 'name') {
            const nameA = playerName(players.find(p => p.id === a.player_id) ?? { firstName: '', lastName: '' });
            const nameB = playerName(players.find(p => p.id === b.player_id) ?? { firstName: '', lastName: '' });
            return sortDirection === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        }
        const diff = getSortValue(a, sortedColumn) - getSortValue(b, sortedColumn);
        return sortDirection === 'asc' ? diff : -diff;
    }) : allStats;

    const battingJSX: JSX.Element[] = sortedStats.map(stats => {
        const player = players.find(p => p.id === stats.player_id);
        return <BatterStatisticsRow key={stats.player_id} pde={stats} player={player} />;
    });

    return (
        <div>
            <button onClick={onBack}>← Back</button>
            <h1>All Player Statistics</h1>
            <h3>Batting</h3>
            <table className="stats-table">
                <thead>
                    <BatterStatisticsTableHeader
                        setSortedColumn={handleSort}
                        sortedColumn={sortedColumn}
                        sortDirection={sortDirection}
                        showName={true}
                    />
                </thead>
                <tbody>{battingJSX}</tbody>
            </table>

            
            {/* <h3>Pitching</h3>
            <table>
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
            </table> */}
        </div>
    );

}

export default AllPlayerStatistics