import { buildFilterSummary } from "../../utils/buildFilterSummary";
import type { Park, statViewTypes } from "../../types";

type FilterPanelProps = {
    viewType: statViewTypes;
    selectedParks: Set<Park>;
    selectedFielderCounts: Set<number>;
    selectedGameIds: Set<number> | null;
    children: React.ReactNode;
};

function FilterPanel({ viewType, selectedParks, selectedFielderCounts, selectedGameIds, children }: FilterPanelProps) {
    const summary = buildFilterSummary(viewType, selectedParks, selectedFielderCounts, selectedGameIds);
    return (
        <div>
            <h3>Filters — {summary}</h3>
            <div className="filter-panel-content">{children}</div>
        </div>
    );
}

export default FilterPanel;
