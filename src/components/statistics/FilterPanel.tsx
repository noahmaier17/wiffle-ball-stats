type FilterPanelProps = {
    summary: string;
    children: React.ReactNode;
};

function FilterPanel({ summary, children }: FilterPanelProps) {
    return (
        <div>
            <h3>Filters — {summary}</h3>
            <div className="filter-panel-content">{children}</div>
        </div>
    );
}

export default FilterPanel;
