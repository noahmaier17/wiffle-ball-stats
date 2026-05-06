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
        homePitcher,
        awayTeamBatting
    } = gameData;

    // Needed to initalize the pitcher
    const getFirstValidPitcher = (t: HomeAway) => {
        const lineup = t === 'away' ? awayTeamLineup : homeTeamLineup;
        const currentPitcher = t === 'away' ? awayPitcher : homePitcher;
        const first = lineup.find(p => p !== currentPitcher);
        return first;
    };

    const [team, setTeam] = useState<HomeAway>(awayTeamBatting ? 'home' : 'away');
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
                <div className="radio-group">
                    {(['away', 'home'] as HomeAway[]).map(t => (
                        <label key={t}>
                            <input
                                type="radio"
                                name="team"
                                value={t}
                                checked={team === t}
                                onChange={() => setTeam(t)}
                            />
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </label>
                    ))}
                </div>
            </div>

            <div>
                <label>Current Pitcher: </label>
                {team === 'away' ? playerName(awayPitcher) : playerName(homePitcher)}
            </div>

            <div>
                <label>New Pitcher: </label>
                <div className="radio-group">
                    {(team === 'away' ? [...awayTeamLineup] : [...homeTeamLineup])
                        .filter(p => p !== awayPitcher && p !== homePitcher)
                        .map(p => (
                            <label key={p.id}>
                                <input
                                    type="radio"
                                    name="new-pitcher"
                                    value={p.id.toString()}
                                    checked={newPitcher?.id === p.id}
                                    onChange={() => setNewPitcher(p)}
                                />
                                {playerName(p)}
                            </label>
                        ))
                    }
                </div>
            </div>
    
            <button
                type="submit"
                disabled={newPitcher === undefined}
                onClick={() => handleSubmit()}
            >Submit</button>
        </form>
    </>)
}

export default PitchingChange
