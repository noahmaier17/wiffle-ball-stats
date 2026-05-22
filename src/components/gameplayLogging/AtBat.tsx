import { useState, useEffect } from 'react'
import { AT_BAT_OUTCOME_LAYOUT, AT_BAT_OUTCOMES_STRIKEOUTS, BASE_HIT_SIGNS } from '../../constants'
import { type AtBatOutcomeSign, type AtBatLog, type GameData, playerName, type Player, ordinalNumber } from '../../types'
import ReverseK from '../ReverseK'

type AtBatProps = {
    gameData: GameData;
    onLogAtBat: (atBat: AtBatLog) => void;
}

const range = (lo: number, hi: number): number[] =>
    Array.from({ length: Math.max(0, hi - lo + 1) }, (_, i) => lo + i);

function validRBIRange(sign: AtBatOutcomeSign | undefined, numberOnBase: number): number[] {
    if (!sign) return range(0, numberOnBase + 1);
    if (AT_BAT_OUTCOMES_STRIKEOUTS.some(o => o.sign === sign)) return [0];
    if (sign === 'HR') return [numberOnBase + 1];
    if (sign === 'BB') return [numberOnBase === 3 ? 1 : 0];
    if (sign === 'IPHR') return range(1, numberOnBase + 1);
    if (sign === 'Out') return range(0, numberOnBase);
    if (sign === 'FC') return range(0, numberOnBase - 1);
    if (BASE_HIT_SIGNS.has(sign)) return range(0, numberOnBase);
    return range(0, numberOnBase + 1);
}

function validOutsRange(sign: AtBatOutcomeSign | undefined, numberOnBase: number, numberOfOuts: number): number[] {
    const maxOuts = 3 - numberOfOuts;
    if (!sign) return range(0, maxOuts);
    if (AT_BAT_OUTCOMES_STRIKEOUTS.some(o => o.sign === sign)) return maxOuts >= 1 ? [1] : [];
    if (sign === 'HR') return [0];
    if (sign === 'BB') return [0];
    if (sign === 'IPHR') return range(0, Math.min(numberOnBase, maxOuts));
    if (sign === 'Out') return range(1, Math.min(numberOnBase + 1, maxOuts));
    if (sign === 'FC') return range(1, Math.min(numberOnBase, maxOuts));
    if (BASE_HIT_SIGNS.has(sign)) return range(0, Math.min(numberOnBase, maxOuts));
    return range(0, maxOuts);
}

function AtBat({ gameData, onLogAtBat }: AtBatProps) {
    const {
        awayTeamLineup,
        homeTeamLineup,
        awayPitcher,
        homePitcher,
        awayTeamBatting,
        currAwayTeamBatter,
        currHomeTeamBatter,
        numberOnBase
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

    const BLACKED_OUT_CSS = "!bg-gray-400 !text-gray-700 !border-gray-400"
    const GRAYED_OUT_CSS = '!bg-gray-200 !text-gray-400 !border-gray-200'

    const validR = validRBIRange(outcomeSign, numberOnBase);
    const validO = validOutsRange(outcomeSign, numberOnBase, gameData.numberOfOuts);

    const displayRBIsButton = (number: number) => {
        const isBlackedOut = number > numberOnBase + 1;
        const isGrayedOut = !isBlackedOut && !validR.includes(number);

        return (<label key={number} className={isBlackedOut ? BLACKED_OUT_CSS : isGrayedOut ? GRAYED_OUT_CSS : ""}>
            <input
                type="radio"
                name="rbis"
                value={number}
                disabled={isGrayedOut || isBlackedOut}
                checked={rbis === number}
                onChange={() => setRbis(number)}
            />
            {number}
        </label>)
    }

    const displayOutsButton = (number: number) => {
        const isBlackedOut = (gameData.numberOfOuts + number > 3);
        const isGrayedOut = !isBlackedOut && !validO.includes(number);

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

    useEffect(() => {
        if (validR.length === 1) {
            setRbis(validR[0]);
        } else {
            setRbis(prev => (prev !== undefined && validR.includes(prev)) ? prev : undefined);
        }

        if (validO.length === 1) {
            setRecordedOuts(validO[0]);
        } else {
            setRecordedOuts(prev => (prev !== undefined && validO.includes(prev)) ? prev : undefined);
        }
    }, [outcomeSign])

    const outcomeButtonText = (sign: string) => {
        switch (sign) {
            case 'reverse-K':
                return <ReverseK/>
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
                            displayRBIsButton(n)
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
                    disabled={(rbis === undefined || outcomeSign === undefined || recordedOuts === undefined || rbis + recordedOuts > (BASE_HIT_SIGNS.has(outcomeSign) || outcomeSign === 'BB' || outcomeSign === 'FC' ? numberOnBase : numberOnBase + 1))}

                    onClick={() => logAtBat()}
                >Submit</button>
            </form>
        </div>
    </>)
}

export default AtBat