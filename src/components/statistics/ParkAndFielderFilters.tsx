import type { Park } from "../../types"
import { FIELDER_COUNTS, PARKS, PARK_DISPLAY_NAMES } from "../../constants";
import type { Dispatch, SetStateAction } from "react";

interface ParkAndFielderFiltersProps {
    selectedParks: Set<Park>,
    setSelectedParks: Dispatch<SetStateAction<Set<Park>>>
    selectedFielderCounts: Set<number>,
    setSelectedFielderCounts: Dispatch<SetStateAction<Set<number>>>
}

function ParkAndFielderFilters(
    { selectedParks, setSelectedParks, selectedFielderCounts, setSelectedFielderCounts }: ParkAndFielderFiltersProps
) {
    const togglePark = (park: Park) => {
        setSelectedParks(prev => {
            const next = new Set(prev);

            (next.has(park))
                ? next.delete(park)
                : next.add(park);

            return next;
        })
    }

    const toggleFielderCount = (count: number) => {
        setSelectedFielderCounts(prev => {
            const next = new Set(prev);

            (next.has(count))
                ? next.delete(count)
                : next.add(count);

            return next;
        })
    }

    const setOfficial = () => {
        setSelectedParks(new Set(PARKS));
        setSelectedFielderCounts(new Set([3]));
    };

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <div>
                Parks:&nbsp;
                {PARKS.map(park => (
                    <label key={park}>
                        <input
                            type="checkbox"
                            checked={selectedParks.has(park)}
                            onChange={() => togglePark(park)}
                        />
                    {PARK_DISPLAY_NAMES[park]}</label>
                ))}
            </div>
            <div>
                Fielder Counts:&nbsp;
                {FIELDER_COUNTS.map(count => (
                    <label
                        key={count}
                    >
                        <input
                            type="checkbox"
                            checked={selectedFielderCounts.has(count)}
                            onChange={() => toggleFielderCount(count)}
                        />
                    {count}
                    </label>
                ))}
            </div>
            <button onClick={setOfficial}>Set Official Settings</button>
        </div>
    )
}

export default ParkAndFielderFilters