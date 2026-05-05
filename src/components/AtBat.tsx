import { useState } from 'react'
import { PLAYERS } from '../wip_data/batters'
import { AT_BAT_OUTCOMES } from '../constants'
import type { AtBatOutcomeSign, AtBatLogList } from '../types'
import BatterOutcomeText from './BattingOutcomeText'

function AtBat() {
    const [batter, setBatter] = useState<string>(PLAYERS[0].name)
    const [pitcher, setPitcher] = useState<string>(PLAYERS[0].name)
    const [rbis, setRbis] = useState<number>(0)
    const [outcomeSign, setOutcomeSign] = useState<AtBatOutcomeSign>("K")
    const [extraComments, setExtraComments] = useState<string>("")

    const [log, setLog] = useState<AtBatLogList[]>([]);

    const logAtBat = () => {
        setLog(prev => [...prev, {batter: batter, pitcher: pitcher, rbis: rbis, outcomeSign: outcomeSign, extraComments: extraComments}])

        setBatter(PLAYERS[0].name);
        setPitcher(PLAYERS[0].name);
        setRbis(0);
        setOutcomeSign("K");
        setExtraComments("");
    }

    return (<>
        <div>
            <h2>At Bat Outcome</h2>
            <form 
                className="at-bat-form"
                onSubmit={(e) => e.preventDefault()}
            >
                <div>
                    <label>Batter: </label>
                    <select 
                        value={batter} 
                        onChange={(e) => setBatter(e.target.value)}
                    >
                        {PLAYERS.map(p => (
                            <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                    </select>
                </div>
                
                <div>
                    <label>Pitcher: </label>
                    <select 
                        value={pitcher} 
                        onChange={(e) => setPitcher(e.target.value)}
                    >
                        {PLAYERS.map(p => (
                            <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                    </select>
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
                        batter={batter}
                        pitcher={pitcher}
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

        <div>
            <ul>
                {log.map((l, index) => (
                    <li key={index}>{l['batter']}: {l['rbis']}-run {l['outcomeSign']}</li>
                ))}
            </ul>
        </div>
    </>)
}

export default AtBat