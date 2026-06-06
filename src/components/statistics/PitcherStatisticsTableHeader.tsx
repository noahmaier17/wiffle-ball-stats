import { type ReactNode } from "react";
import ReverseK from "../ReverseK";
import type { statViewTypes } from "../../types";

type BattePitcherStatisticsTableHeaderProps = {
    viewType: statViewTypes;
    setSortedColumn?: (col: string) => void;
    sortedColumn?: string | null;
    sortDirection?: 'asc' | 'desc';
    showName?: boolean;
}

function PitcherStatisticsTableHeader({
    viewType, 
    setSortedColumn, 
    sortedColumn, 
    sortDirection = 'desc', 
    showName = false
}: BattePitcherStatisticsTableHeaderProps) {
    const indicator = (col: string) => sortedColumn === col ? (sortDirection === 'desc' ? ' ▼' : ' ▲') : '';
    const th = (label: ReactNode, col: string) => (
        <th key={col} onClick={setSortedColumn ? () => setSortedColumn(col) : undefined} style={setSortedColumn ? { cursor: 'pointer' } : undefined}>
            {label}{indicator(col)}
        </th>
    );

    const display = (label: ReactNode) => {
        return (viewType === 'by_game')
            ? <>{label}/G</>
            : (viewType === 'by_AB_and_IP' && !(label === 'IP'))
                ? <>{label}/IP</>
                : (viewType === 'by_PA_and_BF' && !(label === 'BF'))
                    ? <>{label}/BF</>
                    : label
    }

    return (
        <tr>
            {showName && (
                <th onClick={setSortedColumn ? () => setSortedColumn('name') : undefined} style={setSortedColumn ? { cursor: 'pointer' } : undefined}>
                    Name{indicator('name')}
                </th>
            )}

            {th('G', 'games_pitched')}
            {th(display('IP'), 'innings_pitched')}
            {th(display('BF'), 'batters_faced')}
            {th(display('H'), 'hits_allowed')}
            {th(display('R'), 'runs_allowed')}
            {th(display('BB'), 'pitched_walks')}
            {th(display('K'), 'pitched_strikeouts_swinging')}
            {th(display(<ReverseK/>), 'pitched_strikeouts_looking')}
            {th(display('SO'), 'pitched_strikeouts')}
            {th('ERA', 'earned_runs')}
            {th('WHIP', 'walks_plus_hits_per_inning_pitched')}
        </tr>
    );
}

export default PitcherStatisticsTableHeader