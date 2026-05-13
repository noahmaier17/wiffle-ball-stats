import { useState, useEffect } from 'react'
import { AT_BAT_OUTCOME_LAYOUT, AT_BAT_OUTCOMES_STRIKEOUTS } from '../constants'
import { type AtBatOutcomeSign, type AtBatLog, type GameData, playerName, type Player, ordinalNumber } from '../types'

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

    const displayOutsButton = (number: number) => {
        const BLACKED_OUT_CSS = "!bg-gray-400 !text-gray-700 !border-gray-400"
        const GRAYED_OUT_CSS = '!bg-gray-200 !text-gray-400 !border-gray-200'

        const isBlackedOut = (gameData.numberOfOuts + number > 3);
        const isGrayedOut = (
            (number !== 1 && AT_BAT_OUTCOMES_STRIKEOUTS.some(o => o.sign === outcomeSign)) ||
            (number !== 0 && outcomeSign === 'HR') ||
            (number !== 0 && outcomeSign === 'BB') ||
            (number === 0 && outcomeSign === 'Out') ||
            (number === 0 && outcomeSign === 'FC')
        );

        return (
            <label key={number} className={isBlackedOut ? BLACKED_OUT_CSS : isGrayedOut ? GRAYED_OUT_CSS : ""}>
                <input
                    type="radio"
                    name="recorded outs"
                    value={number}
                    disabled={isBlackedOut || isGrayedOut}
                    checked={recordedOuts === number}
                    onChange={() => setRecordedOuts(number)}
                />
                {number}
            </label>
        );
    }

    // If we select specific outcomes, we must change our RBIs and Recorded Outs
    useEffect(() => {
        if (AT_BAT_OUTCOMES_STRIKEOUTS.some(o => o.sign === outcomeSign)) { // Strikeout
            setRbis(0);
            setRecordedOuts(1);
        } else if (outcomeSign === 'HR') {
            setRbis(undefined);
            setRecordedOuts(0);
        } else if (outcomeSign === 'IPHR') {
            setRbis(undefined);
        } else if (outcomeSign === 'BB') {
            setRbis(undefined);
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
                <div style={{ whiteSpace: 'pre-wrap' }}>
                    <label><b><u>Batting {ordinalNumber((awayTeamBatting ? currAwayTeamBatter : currHomeTeamBatter) + 1)}:{"\t"}</u></b></label>
                    {playerName(batterName)}
                </div>

                <div style={{ whiteSpace: 'pre-wrap' }}>
                    <label><b><u>Pitcher:{"\t\t"}</u></b></label>
                    {playerName(pitcherName)}
                </div>

                <div>
                    <label>Outcome: </label>
                    {AT_BAT_OUTCOME_LAYOUT.map((row, i) => (
                        <div key={i} className="radio-group  radio-group--fill">
                            {row.map(abo => (
                                <label key={abo.sign}>
                                    <input
                                        type="radio"
                                        name="batting-outcome"
                                        value={abo.sign}
                                        checked={outcomeSign === abo.sign}
                                        onChange={() => setOutcomeSign(abo.sign as AtBatOutcomeSign)}
                                    />
                                    {outcomeButtonText(abo.sign)}
                                </label>
                            ))}
                        </div>
                    ))}
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
                                    disabled={(
                                        (n !== 0 && AT_BAT_OUTCOMES_STRIKEOUTS.some(o => o.sign === outcomeSign)) ||
                                        (n === 0 && (outcomeSign === 'HR' || outcomeSign === 'IPHR')) ||
                                        (n > 1 && outcomeSign === 'BB')
                                    )}
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
                            displayOutsButton(n)
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