import { useState, useEffect } from "react";
import { type HomeAway, playerName, type GameData, type PitchingChangeLog } from "../types";

type PitchingChangeProps = {
    gameData: GameData;
    onLogPitchingChange: (pitchingChange: PitchingChangeLog) => void;
}

function PitchingChange({ gameData, onLogPitchingChange }: PitchingChangeProps) {
    const {
        awayTeamLineup,
        homeTeamLineup,
        awayPitcher,
        homePitcher
    } = gameData;

    // Needed to initalize the pitcher
    const getFirstValidPitcher = (t: HomeAway) => {
        const lineup = t === 'away' ? awayTeamLineup : homeTeamLineup;
        const currentPitcher = t === 'away' ? awayPitcher : homePitcher;
        const first = lineup.find(p => p !== currentPitcher);
        return first ? playerName(first) : "";
    };

    const [team, setTeam] = useState<HomeAway>('home');
    const [newPitcher, setNewPitcher] = useState<string>(() => getFirstValidPitcher('home'));

    // And updates the new pitcher field when we change team
    useEffect(() => {
        setNewPitcher(getFirstValidPitcher(team));
    }, [team]);

    return (<>
        <h1>Log Pitching Change</h1>
        <form 
            className="at-bat-form"
            onSubmit={(e) => e.preventDefault()}
        >
            <div>
                <label>Team: </label>
                <select
                    value={team}
                    onChange={(e) => setTeam(e.target.value as HomeAway)}
                >
                    <option value={'home'}>Home</option>
                    <option value={'away'}>Away</option>
                </select>

                <label>New Pitcher: </label>
                <select 
                    value={newPitcher} 
                    onChange={(e) => setNewPitcher(e.target.value)}
                >
                    {(team === 'away' ? [...awayTeamLineup] : [...homeTeamLineup]).map(p => (
                        <option 
                            key={p.id} 
                            value={playerName(p)}
                            disabled={p === awayPitcher || p === homePitcher}
                        >
                            {playerName(p)}
                        </option>
                    ))}
                </select>
            </div>

        
            <button
                type="submit"
                onClick={() => onLogPitchingChange({ 
                    type: 'pitching_change', 
                    oldPitcher: team === 'away' ? playerName(awayPitcher) : playerName(homePitcher),
                    newPitcher 
                })}
            >Log Pitching Change</button>
        </form>
    </>)
}

export default PitchingChange
