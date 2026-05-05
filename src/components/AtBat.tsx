import { useState, useEffect } from 'react'
import { AT_BAT_OUTCOMES } from '../constants'
import { type AtBatOutcomeSign, type AtBatLog, type GameData, playerName } from '../types'
import BatterOutcomeText from './BattingOutcomeText'

type AtBatProps = {
    gameData: GameData;
    onLogAtBat: (atBat: AtBatLog) => void;
}

function AtBat({ gameData, onLogAtBat }: AtBatProps) {
    const {
        awayTeamLineup,
        homeTeamLineup,
        awayPitcher,
        homePitcher,
        awayTeamBatting,
        currAwayTeamBatter,
        currHomeTeamBatter
    } = gameData;

    const battingLineup = awayTeamBatting ? awayTeamLineup : homeTeamLineup;
    const currentBatter = awayTeamBatting ? awayTeamLineup[currAwayTeamBatter] : homeTeamLineup[currHomeTeamBatter];
    const pitcherName = playerName(awayTeamBatting ? homePitcher : awayPitcher);

    const [batterName, setBatterName] = useState<string>(playerName(currentBatter));
    useEffect(() => {
        setBatterName(playerName(currentBatter));
    }, [currentBatter]);

    // Parameters for the logged occurance
    const [rbis, setRbis] = useState<number>(0)
    const [outcomeSign, setOutcomeSign] = useState<AtBatOutcomeSign>("K")
    const [extraComments, setExtraComments] = useState<string>("")

    // Function to log an at bat
    const logAtBat = () => {
        // Updates our log
        onLogAtBat({ type: 'atbat', batter: batterName, pitcher: pitcherName, rbis, outcomeSign, extraComments });
        
        // Resets the values for the form
        setRbis(0);
        setOutcomeSign("K");
        setExtraComments("");
    }

    return (<>
        <div>
            <h1>Log At Bat</h1>
            <form 
                className="at-bat-form"
                onSubmit={(e) => e.preventDefault()}
            >
                <div>
                    <label>Batter: </label>
                    <select 
                        value={batterName} 
                        onChange={(e) => setBatterName(e.target.value)}
                    >
                        {battingLineup.map(p => (
                            <option key={p.id} value={playerName(p)}>{playerName(p)}</option>
                        ))}
                    </select>
                </div>
                
                <div>
                    <label>Pitcher: </label>
                    {pitcherName}
                </div>

                <div>
                    <label>RBIs: </label>
                    {[0, 1, 2, 3, 4].map(n => (
                        <label key={n}>
                            <input
                                type="radio"
                                name="rbis"
                                value={n}
                                checked={rbis === n}
                                onChange={() => setRbis(n)}
                            />
                            {n}
                        </label>
                    ))}
                </div>

                <div>
                    <label>Outcome: </label>
                    {AT_BAT_OUTCOMES.map(abo => (
                        <label key={abo.sign}>
                            <input
                                type="radio"
                                name="bating outcome"
                                value={abo.sign}
                                checked={outcomeSign === abo.sign}
                                onChange={() => setOutcomeSign(abo.sign)}
                            />
                            {abo.sign}
                        </label>
                    ))}
                </div>
            
                <div>
                    <textarea
                        value={extraComments}
                        onChange={(e) => setExtraComments(e.target.value)}
                        placeholder='Extra comments'
                    >
                        {extraComments}
                    </textarea>
                </div>

                <div>
                    <BatterOutcomeText
                        batter={batterName}
                        pitcher={pitcherName}
                        rbis={rbis}
                        outcomeSign={outcomeSign}
                    />
                </div>

                <button
                    type="submit"
                    onClick={() => logAtBat()}
                >Log at bat</button>
            </form>
        </div>
    </>)
}

export default AtBat