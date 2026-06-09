import { PARK_DISPLAY_NAMES, PARKS } from '../constants';
import type { Park, statViewTypes } from '../types';

const VIEW_TYPE_LABELS: Record<statViewTypes, string> = {
    default: 'Default',
    by_game: 'By Game',
    by_PA_and_BF: 'By PA/BF',
    by_AB_and_IP: 'By AB/IP',
};

export function buildFilterSummary(
    viewType: statViewTypes,
    selectedParks: Set<Park>,
    selectedFielderCounts: Set<number>,
    selectedGameIds: Set<number> | null,
): string {
    const parkSummary = selectedParks.size === 0
        ? 'No Parks'
        : selectedParks.size === PARKS.length
        ? 'All Parks'
        : Array.from(selectedParks).map(p => PARK_DISPLAY_NAMES[p] ?? p).join(' & ');

    const fielderCounts = [...selectedFielderCounts].sort((a, b) => a - b);
    const fielderSummary = fielderCounts.length === 0
        ? 'No Fielders'
        : fielderCounts.length === 1
        ? `${fielderCounts[0]} Fielders`
        : `${fielderCounts[0]}-${fielderCounts[fielderCounts.length - 1]} Fielders`;

    const gameSummary = selectedGameIds === null
        ? 'All Games'
        : `${selectedGameIds.size} Game${selectedGameIds.size === 1 ? '' : 's'}`;

    return `${VIEW_TYPE_LABELS[viewType]} · ${parkSummary} · ${fielderSummary} · ${gameSummary}`;
}
