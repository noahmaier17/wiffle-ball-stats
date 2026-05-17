import { useState, useEffect } from "react"
import type { EditGamestateLog, GameData } from "../../types"
import { playerName } from "../../types"
import { supabase } from "../../supabase-client"
import type { Player } from "../../types"

type EditGamestateProps = {
    gameData: GameData
    onUpdate: (updated: EditGamestateLog) => void
}

function EditGamestate({ gameData, onUpdate }: EditGamestateProps) {
    const [draft, setDraft] = useState<GameData>(gameData)
    const [allPlayers, setAllPlayers] = useState<Player[]>([])
    const [info, setInfo] = useState<string>("");

    useEffect(() => {
        supabase.from('players').select('id, first_name, last_name').then(({ data }) => {
            if (data) setAllPlayers(data.map(p => ({ id: p.id, firstName: p.first_name, lastName: p.last_name })))
        })
    }, [])

    const set = <K extends keyof GameData>(key: K, value: GameData[K]) =>
        setDraft(prev => ({ ...prev, [key]: value }))

    const setLineupPlayer = (
        lineup: 'awayTeamLineup' | 'homeTeamLineup',
        index: number,
        playerId: number
    ) => {
        const player = allPlayers.find(p => p.id === playerId)
        if (!player) return
        setDraft(prev => ({
            ...prev,
            [lineup]: prev[lineup].map((p, i) => i === index ? player : p)
        }))
    }

    const addToLineup = (lineup: 'awayTeamLineup' | 'homeTeamLineup') => {
        const defaultPlayer = allPlayers[0]
        if (!defaultPlayer) return
        setDraft(prev => ({ ...prev, [lineup]: [...prev[lineup], defaultPlayer] }))
    }

    const removeFromLineup = (lineup: 'awayTeamLineup' | 'homeTeamLineup', index: number) =>
        setDraft(prev => ({ ...prev, [lineup]: prev[lineup].filter((_, i) => i !== index) }))

    const handleSubmit = (e: React.SyntheticEvent) => {
        e.preventDefault()
        onUpdate({ type: 'edit_gamestate', newGameData: draft, info })
    }

    return (
        <form onSubmit={handleSubmit}>
            <h3>Edit Game State</h3>

            <h4>Score</h4>
            <div style={{ display: 'flex', gap: '1em' }}>
                <label>Away Runs: <input type="number" value={draft.awayRuns} onChange={e => set('awayRuns', Number(e.target.value))} style={{ width: '4em' }} /></label>
                <label>Home Runs: <input type="number" value={draft.homeRuns} onChange={e => set('homeRuns', Number(e.target.value))} style={{ width: '4em' }} /></label>
            </div>

            <hr />

            <h4>Game State</h4>
            <div style={{ display: 'flex', gap: '1em', flexWrap: 'wrap' }}>
                <label>Inning: <input type="number" value={draft.inning} onChange={e => set('inning', Number(e.target.value))} style={{ width: '4em' }} /></label>
                <label>Outs: <input type="number" min={0} max={2} value={draft.numberOfOuts} onChange={e => set('numberOfOuts', Number(e.target.value))} style={{ width: '3em' }} /></label>
                <label>Away Team Batting: <input type="checkbox" checked={draft.awayTeamBatting} onChange={e => set('awayTeamBatting', e.target.checked)} /></label>
            </div>
            {(() => {
                const lineup = draft.awayTeamBatting ? draft.awayTeamLineup : draft.homeTeamLineup
                const currIdx = draft.awayTeamBatting ? draft.currAwayTeamBatter : draft.currHomeTeamBatter
                const onDeckIdx = (currIdx + 1) % lineup.length
                const current = lineup[currIdx]
                const onDeck = lineup[onDeckIdx]
                return lineup.length > 0 ? (
                    <div style={{ marginTop: '0.5em', color: '#555' }}>
                        <span>At bat: <strong>{current ? playerName(current) : '—'}</strong></span>
                        <span style={{ marginLeft: '1.5em' }}>On deck: <strong>{onDeck ? playerName(onDeck) : '—'}</strong></span>
                    </div>
                ) : null
            })()}

            <hr />

            <h4>Current Batters</h4>
            <div style={{ display: 'flex', gap: '1em', flexWrap: 'wrap' }}>
                <label>
                    Away Batter:&nbsp;
                    <select value={draft.currAwayTeamBatter} onChange={e => set('currAwayTeamBatter', Number(e.target.value))}>
                        {draft.awayTeamLineup.map((p, i) => (
                            <option key={i} value={i}>{i + 1}. {playerName(p)}</option>
                        ))}
                    </select>
                </label>
                <label>
                    Home Batter:&nbsp;
                    <select value={draft.currHomeTeamBatter} onChange={e => set('currHomeTeamBatter', Number(e.target.value))}>
                        {draft.homeTeamLineup.map((p, i) => (
                            <option key={i} value={i}>{i + 1}. {playerName(p)}</option>
                        ))}
                    </select>
                </label>
            </div>

            <hr />

            {(['awayTeamLineup', 'homeTeamLineup'] as const).map(lineupKey => (
                <div key={lineupKey}>
                    <h4>{lineupKey === 'awayTeamLineup' ? 'Away' : 'Home'} Team Lineup</h4>
                    {draft[lineupKey].map((player, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5em', marginBottom: '0.25em' }}>
                            <strong>#{i + 1}</strong>
                            <select value={player.id} onChange={e => setLineupPlayer(lineupKey, i, Number(e.target.value))}>
                                {allPlayers.map(p => (
                                    <option key={p.id} value={p.id}>{playerName(p)}</option>
                                ))}
                            </select>
                            <button type="button" onClick={() => removeFromLineup(lineupKey, i)}>Remove</button>
                        </div>
                    ))}
                    <button type="button" onClick={() => addToLineup(lineupKey)}>+ Add Player</button>
                </div>
            ))}

            <hr />

            <h4>Gamestate Editing Justification</h4>
            <textarea
                value={info}
                onChange={(e) => setInfo(e.target.value)}
                placeholder="Why was the game state edited?"
            />

            <hr />

            <button type="submit" disabled={info.trim() === ""}>Save Changes</button>
        </form>
    )
}

export default EditGamestate