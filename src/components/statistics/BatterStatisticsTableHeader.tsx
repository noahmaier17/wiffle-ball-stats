import { type ReactNode } from "react";
import ReverseK from "../ReverseK";
import type { statViewTypes } from "../../types";

type BatterStatisticsTableHeaderProps = {
    viewType: statViewTypes;
    setSortedColumn?: (col: string) => void;
    sortedColumn?: string | null;
    sortDirection?: 'asc' | 'desc';
    showName?: boolean;
    includeIndex?: boolean;
}

function BatterStatisticsTableHeader({ 
    viewType, 
    setSortedColumn, 
    sortedColumn, 
    sortDirection = 'desc', 
    showName = false,
    includeIndex = false
}: BatterStatisticsTableHeaderProps) {
    const indicator = (col: string) => sortedColumn === col ? (sortDirection === 'desc' ? ' ▼' : ' ▲') : '';
    const th = (label: ReactNode, col: string) => (
        <th key={col} onClick={setSortedColumn ? () => setSortedColumn(col) : undefined} style={setSortedColumn ? { cursor: 'pointer' } : undefined}>
            {label}{indicator(col)}
        </th>
    );

    const display = (label: ReactNode) => {
        return (viewType === 'by_game')
            ? <>{label}/G</>
            : (viewType === 'by_PA_and_BF' && !(label === 'W' || label === 'L' || label === 'PA'))
                ? <>{label}/PA</>
                : (viewType === 'by_AB_and_IP' && !(label === 'W' || label === 'L' || label == 'AB'))
                    ? <>{label}/AB</>
                    : label

    }
 
    return (
        <tr>
            {includeIndex && <td></td>}
            {showName && (
                <th onClick={setSortedColumn ? () => setSortedColumn('name') : undefined} style={setSortedColumn ? { cursor: 'pointer' } : undefined}>
                    Name{indicator('name')}
                </th>
            )}
            {th('G', 'games_played')}
            {th(display('W'), 'win')}
            {th(display('L'), 'loss')}
            {th('STK', 'current_streak')}
            {th('wSTK', 'longest_win_streak')}
            {th('lSTK', 'longest_loss_streak')}
            {th(display('PA'), 'plate_appearances')}
            {th(display('AB'), 'at_bats')}
            {th(display('H'), 'hits')}
            {th(display('1B'), 'singles')}
            {th(display('2B'), 'doubles')}
            {th(display('3B'), 'triples')}
            {th(display('HR'), 'home_runs')}
            {th(display('IPHR'), 'inside_the_park_home_runs')}
            {th(display('RBI'), 'runs_batted_in')}
            {th(display('BB'), 'walks')}
            {th(display('K'), 'strikeouts_swinging')}
            {th(display(<ReverseK/>), 'strikeouts_looking')}
            {th(display('SO'), 'strikeouts')}
            {th(display('FC'), 'fielders_choice')}
            {th(display('TB'), 'tb')}
            {th('BA', 'ba')}
            {th('OBP', 'obp')}
            {th('SLG', 'slg')}
            {th('OPS', 'ops')}
        </tr>
    );
}

export default BatterStatisticsTableHeader