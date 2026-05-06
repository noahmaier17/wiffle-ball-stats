import { useState, useEffect } from "react";
import { type HomeAway, playerName, type GameData, type PitchingChangeLog, type Player } from "../types";

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
        return first;
    };

    const [team, setTeam] = useState<HomeAway>('home');
    const [newPitcher, setNewPitcher] = useState<Player | undefined>(() => getFirstValidPitcher('home'));

    useEffect(() => {
        setNewPitcher(getFirstValidPitcher(team));
    }, [team, awayPitcher, homePitcher]);

    const handleSubmit = () => {
        if (!newPitcher) return; // Type guard; we cannot handleSubmit unless the button is enabled

        onLogPitchingChange({
            type: 'pitching_change',
            teamChangingPitchers: team,
            oldPitcher: team === 'away' ? awayPitcher : homePitcher,
            newPitcher
        });
    }

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
            </div>
            
            <div>
                <label>New Pitcher: </label>
                <select
                    value={newPitcher?.id.toString()}
                    onChange={(e) => {
                        const lineup = team === 'away' ? awayTeamLineup : homeTeamLineup;
                        setNewPitcher(lineup.find(p => p.id.toString() === e.target.value));
                    }}
                >
                    {(team === 'away' ? [...awayTeamLineup] : [...homeTeamLineup]).map(p => (
                        <option
                            key={p.id}
                            value={p.id.toString()}
                            disabled={p === awayPitcher || p === homePitcher}
                        >
                            {playerName(p)}
                        </option>
                    ))}
                </select>
            </div>    
    
            <button
                type="submit"
                disabled={newPitcher === undefined}
                onClick={() => handleSubmit()}
            >Log Pitching Change</button>
        </form>
    </>)
}

export default PitchingChange
