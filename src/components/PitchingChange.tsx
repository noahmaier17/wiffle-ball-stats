import { useState } from "react";
import { playerName, type GameData, type PitchingChangeLog } from "../types";

type PitchingChangeProps = {
    gameData: GameData;
    onLogPitchingChange: (pitchingChange: PitchingChangeLog) => void;
}

function PitchingChange({ gameData, onLogPitchingChange }: PitchingChangeProps) {
    const {
        awayTeamLineup,
        homeTeamLineup,
    } = gameData;

    const [newPitcher, setNewPitcher] = useState<string>("");

    return (<>
        <h1>Log Pitching Change</h1>
        <form 
            className="at-bat-form"
            onSubmit={(e) => e.preventDefault()}
        >
            <div>
                <label>New Pitcher: </label>
                <select 
                    value={newPitcher} 
                    onChange={(e) => setNewPitcher(e.target.value)}
                >
                    {[...awayTeamLineup, ...homeTeamLineup].map(p => (
                        <option key={p.id} value={playerName(p)}>{playerName(p)}</option>
                    ))}
                </select>
            </div>

        
            <button
                type="submit"
                onClick={() => onLogPitchingChange({ type: 'pitching_change', newPitcher })}
            >Log at bat</button>
        </form>
    </>)
}

export default PitchingChange
