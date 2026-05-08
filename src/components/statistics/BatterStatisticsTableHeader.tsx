type BatterStatisticsTableHeaderProps = {
    setSortedColumn?: (col: string) => void;
    sortedColumn?: string | null;
    sortDirection?: 'asc' | 'desc';
    showName?: boolean;
}

function BatterStatisticsTableHeader({ setSortedColumn, sortedColumn, sortDirection = 'desc', showName = false }: BatterStatisticsTableHeaderProps) {
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
            {th('AB', 'at_bats')}
            {th('H', 'hits')}
            {th('1B', 'singles')}
            {th('2B', 'doubles')}
            {th('3B', 'triples')}
            {th('HR', 'home_runs')}
            {th('IPHR', 'inside_the_park_home_runs')}
            {th('RBI', 'runs_batted_in')}
            {th('BB', 'walks')}
            {th('K', 'strikeouts_swinging')}
            {th('KI', 'strikeouts_looking')}
            {th('SO', 'strikeouts')}
            {th('BA', 'ba')}
            {th('OBP', 'obp')}
            {th('SLG', 'slg')}
            {th('OPS', 'ops')}
            {th('TB', 'tb')}
        </tr>
    );
}

export default BatterStatisticsTableHeader