type BattePitcherStatisticsTableHeaderProps = {
    setSortedColumn?: (col: string) => void;
    sortedColumn?: string | null;
    sortDirection?: 'asc' | 'desc';
    showName?: boolean;
}

function PitcherStatisticsTableHeader({ setSortedColumn, sortedColumn, sortDirection = 'desc', showName = false }: BattePitcherStatisticsTableHeaderProps) {
    const indicator = (col: string) => sortedColumn === col ? (sortDirection === 'desc' ? ' ▼' : ' ▲') : '';
    const th = (label: string, col: string) => (
        <th key={col} onClick={setSortedColumn ? () => setSortedColumn(col) : undefined} style={setSortedColumn ? { cursor: 'pointer' } : undefined}>
            {label}{indicator(col)}
        </th>
    );

    return (
        <tr>
            {showName && (
                <th onClick={setSortedColumn ? () => setSortedColumn('name') : undefined} style={setSortedColumn ? { cursor: 'pointer' } : undefined}>
                    Name{indicator('name')}
                </th>
            )}

            {th('IP', 'innings_pitched')}
            {th('ERA', 'earned_runs')}
            {th('G', 'games_pitched')}
            {th('H', 'hits_allowed')}
            {th('R', 'runs_allowed')}
            {th('BB', 'pitched_walks')}
            {th('K', 'pitched_strikeouts_swinging')}
            {th('KI', 'pitched_strikeouts_looking')}
            {th('SO', 'pitched_strikeouts')}
        </tr>
    );
}

export default PitcherStatisticsTableHeader