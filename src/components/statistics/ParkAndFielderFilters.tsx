import type { Park } from "../../types"
import { PARKS, PARK_DISPLAY_NAMES } from "../../constants";
import type { Dispatch, SetStateAction } from "react";

interface ParkAndFielderFiltersProps {
    selectedParks: Set<Park>,
    setSelectedParks: Dispatch<SetStateAction<Set<Park>>>
}

function ParkAndFielderFilters({ selectedParks, setSelectedParks }: ParkAndFielderFiltersProps) {
    const togglePark = (park: Park) => {
        setSelectedParks(prev => {
            const next = new Set(prev);

            (next.has(park))
                ? next.delete(park)
                : next.add(park);

            return next;
        })
    }

    return (<div>
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
    </div>)
}

export default ParkAndFielderFilters