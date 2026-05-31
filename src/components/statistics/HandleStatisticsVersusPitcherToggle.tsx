import { playerNameShort, type Player } from "../../types"

interface HandleStatisticsVersusPositionToggleProps {
    allPitcherIds: Player[],
    selectedPitcherId: number | null,
    setSelectedPitcherId: (id: number | null) => void,
    isVerusBatter: boolean
}

function HandleStatisticsVersusPositionToggle({ allPitcherIds, selectedPitcherId, setSelectedPitcherId, isVerusBatter }: HandleStatisticsVersusPositionToggleProps) {
    return (<div>
        <label>
        Facing Which {(isVerusBatter) ? "Batter" : "Pitcher"}:&nbsp;
        <select value={selectedPitcherId ?? "all"} onChange={(e) => setSelectedPitcherId(e.target.value === "all" ? null : Number(e.target.value))}>
            <option value="all">All</option>
            {allPitcherIds.map(p => (
                <option key={p.id} value={p.id}>
                    {playerNameShort(p)}
                </option>
            ))}
        </select>
        </label>
    </div>)
}

export default HandleStatisticsVersusPositionToggle