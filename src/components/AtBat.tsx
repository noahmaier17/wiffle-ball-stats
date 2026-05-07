import { useState, useEffect } from 'react'
import { AT_BAT_OUTCOMES_BASE_HITS, AT_BAT_OUTCOMES_OTHER, AT_BAT_OUTCOMES_STRIKEOUTS } from '../constants'
import { type AtBatOutcomeSign, type AtBatLog, type GameData, playerName, type Player } from '../types'
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

    // const battingLineup = awayTeamBatting ? awayTeamLineup : homeTeamLineup;
    const currentBatter = awayTeamBatting ? awayTeamLineup[currAwayTeamBatter] : homeTeamLineup[currHomeTeamBatter];
    const pitcherName = awayTeamBatting ? homePitcher : awayPitcher;

    const [batterName, setBatterName] = useState<Player>(currentBatter);

    useEffect(() => {
        setBatterName(currentBatter);
    }, [currentBatter]);

    // Parameters for the logged occurance
    const [rbis, setRbis] = useState<number | undefined>(undefined) // Default undefined until changed
    const [outcomeSign, setOutcomeSign] = useState<AtBatOutcomeSign | undefined>(undefined) // Default undefined until changed
    const [recordedOuts, setRecordedOuts] = useState<number | undefined>(undefined) // Default undefined until changed
    const [extraComments, setExtraComments] = useState<string>("")

    // Function to log an at bat
    const logAtBat = () => {
        // Type guard; we cannot handleSubmit unless the button is enabled
        if (rbis === undefined || !outcomeSign || recordedOuts === undefined) return;

        // Updates our log
        onLogAtBat({ type: 'atbat', batter: batterName, pitcher: pitcherName, rbis, recordedOuts, outcomeSign, extraComments });

        // Resets the values for the form
        setRbis(undefined);
        setOutcomeSign(undefined);
        setRecordedOuts(undefined);
        setExtraComments("");
    }

    // If we select specific outcomes, we must change our RBIs and Recorded Outs
    useEffect(() => {
        if (AT_BAT_OUTCOMES_STRIKEOUTS.some(o => o.sign === outcomeSign)) { // Strikeout
            setRbis(0);
            setRecordedOuts(1);
        } else if (outcomeSign === 'HR') {
            setRbis(1);
            setRecordedOuts(0);
        } else if (outcomeSign === 'IPHR') { 
            setRbis(1);
        } else if (outcomeSign === 'BB') {
            setRecordedOuts(0);
        } else if (outcomeSign === 'Out' && (recordedOuts === 0 || recordedOuts === undefined)) {
            setRecordedOuts(1);
        }
    }, [outcomeSign])

    const outcomeButtonText = (sign: string) => {
        switch (sign) {
            case 'reverse-K':
                return <span style={{ display: 'inline-block', transform: 'scaleX(-1)' }}>K</span>
            default:
                return <>{sign}</>
        }
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
                    {playerName(batterName)}
                </div>

                <div>
                    <label>Pitcher: </label>
                    {playerName(pitcherName)}
                </div>

                <div>
                    <label>Outcome: </label>
                    <div className="radio-group  radio-group--fill">
                        {AT_BAT_OUTCOMES_BASE_HITS.map(abo => (
                            <label key={abo.sign}>
                                <input
                                    type="radio"
                                    name="batting-outcome"
                                    value={abo.sign}
                                    checked={outcomeSign === abo.sign}
                                    onChange={() => setOutcomeSign(abo.sign)}
                                />
                                {outcomeButtonText(abo.sign)}
                            </label>
                        ))}
                    </div>
                    <div className="radio-group  radio-group--fill">
                        {AT_BAT_OUTCOMES_OTHER.map(abo => (
                            <label key={abo.sign}>
                                <input
                                    type="radio"
                                    name="batting-outcome"
                                    value={abo.sign}
                                    checked={outcomeSign === abo.sign}
                                    onChange={() => setOutcomeSign(abo.sign)}
                                />
                                {outcomeButtonText(abo.sign)}
                            </label>
                        ))}
                        {AT_BAT_OUTCOMES_STRIKEOUTS.map(abo => (
                            <label key={abo.sign}>
                                <input
                                    type="radio"
                                    name="batting-outcome"
                                    value={abo.sign}
                                    checked={outcomeSign === abo.sign}
                                    onChange={() => setOutcomeSign(abo.sign)}
                                />
                                {outcomeButtonText(abo.sign)}
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <label>RBIs: </label>
                    <div className="radio-group radio-group--fill">
                        {[0, 1, 2, 3, 4].map(n => (
                            <label key={n}>
                                <input
                                    type="radio"
                                    name="rbis"
                                    value={n}
                                    disabled={
                                        (n !== 0 && AT_BAT_OUTCOMES_STRIKEOUTS.some(o => o.sign === outcomeSign)) ||
                                        (n === 0 && (outcomeSign === 'HR' || outcomeSign === 'IPHR')) ||
                                        (n > 1 && outcomeSign === 'BB')
                                    }
                                    checked={rbis === n}
                                    onChange={() => setRbis(n)}
                                />
                                {n}
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <label>Recorded Outs: </label>
                    <div className="radio-group radio-group--fill">
                        {[0, 1, 2, 3].map(n => (
                            <label key={n}>
                                <input
                                    type="radio"
                                    name="recorded outs"
                                    value={n}
                                    disabled={
                                        (gameData.numberOfOuts + n > 3) ||
                                        (n !== 1 && AT_BAT_OUTCOMES_STRIKEOUTS.some(o => o.sign === outcomeSign)) ||
                                        (n !== 0 && outcomeSign === 'HR') ||
                                        (n !== 0 && outcomeSign === 'BB') ||
                                        (n === 0 && outcomeSign === 'Out')
                                    }
                                    checked={recordedOuts === n}
                                    onChange={() => setRecordedOuts(n)}
                                />
                                {n}
                            </label>
                        ))}
                    </div>
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
                        batter={playerName(batterName)}
                        pitcher={playerName(pitcherName)}
                        rbis={rbis}
                        outcomeSign={outcomeSign}
                    />
                </div>

                <button
                    type="submit"
                    className="submit-btn"
                    disabled={(rbis === undefined || outcomeSign === undefined || recordedOuts === undefined)}

                    onClick={() => logAtBat()}
                >Submit</button>
            </form>
        </div>
    </>)
}

export default AtBat