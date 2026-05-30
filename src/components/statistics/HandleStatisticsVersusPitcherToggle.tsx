import { playerNameShort, type Player } from "../../types"

interface HandleStatisticsVersusPitcherToggleProps {
    allPitcherIds: Player[],
    selectedPitcherId: number | null,
    setSelectedPitcherId: (id: number | null) => void

}

function HandleStatisticsVersusPitcherToggle({ allPitcherIds, selectedPitcherId, setSelectedPitcherId }: HandleStatisticsVersusPitcherToggleProps) {
    return (<div>
        <label>
        Facing Which Pitcher:&nbsp;
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

export default HandleStatisticsVersusPitcherToggle