import type { statViewTypes } from "../../types"

interface HandleStatisticsViewToggleProps {
    viewType: statViewTypes,
    setViewType: (viewType: statViewTypes) => void
}

function HandleStatisticsViewToggle({ viewType, setViewType }: HandleStatisticsViewToggleProps) {
    return (<div>
        Statistics Viewing Type:
        <label>
            <input
                type="radio"
                name="view type"
                value="default"
                checked={viewType === "default"}
                onChange={(e) => setViewType(e.target.value as statViewTypes)}
            />
            Default
        </label>
        <label>
            <input
                type="radio"
                name="view type"
                value="by_game"
                checked={viewType === "by_game"}
                onChange={(e) => setViewType(e.target.value as statViewTypes)}
            />
            Per Game
        </label>
    </div>)
}

export default HandleStatisticsViewToggle