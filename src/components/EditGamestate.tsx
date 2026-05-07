import { useState, useEffect } from "react"
import type { EditGamestateLog, GameData, Player } from "../types"
import { playerName } from "../types"
import { supabase } from "../supabase-client"

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
        field: keyof Player,
        value: string | number
    ) => {
        setDraft(prev => ({
            ...prev,
            [lineup]: prev[lineup].map((p, i) =>
                i === index ? { ...p, [field]: field === 'id' ? Number(value) : value } : p
            )
        }))
    }

    const addToLineup = (lineup: 'awayTeamLineup' | 'homeTeamLineup') => {
        setDraft(prev => {
            const existing = prev[lineup]
            const newId = existing.length > 0 ? Math.max(...existing.map(p => p.id)) + 1 : 1
            return { ...prev, [lineup]: [...existing, { id: newId, firstName: '', lastName: '' }] }
        })
    }

    const removeFromLineup = (lineup: 'awayTeamLineup' | 'homeTeamLineup', index: number) =>
        setDraft(prev => ({ ...prev, [lineup]: prev[lineup].filter((_, i) => i !== index) }))

    const handleSubmit = (e: React.SyntheticEvent) => {
        e.preventDefault()
        onUpdate({ type: 'edit_gamestate', newGameData: draft, info })
    }

    const renderPlayerFields = (
        label: string,
        player: Player,
        onChange: (field: keyof Player, value: string | number) => void
    ) => (
        <div style={{ marginBottom: '0.5em' }}>
            <strong>{label}</strong>
            <div style={{ display: 'flex', gap: '0.5em', marginTop: '0.25em' }}>
                <label>ID: <input type="number" value={player.id} onChange={e => onChange('id', Number(e.target.value))} style={{ width: '4em' }} /></label>
                <label>First: <input type="text" value={player.firstName} onChange={e => onChange('firstName', e.target.value)} /></label>
                <label>Last: <input type="text" value={player.lastName} onChange={e => onChange('lastName', e.target.value)} /></label>
            </div>
        </div>
    )

    return (
        <form onSubmit={handleSubmit}>
            <h3>Edit Game State</h3>

            <h4>All Players (DB)</h4>
            <table>
                <thead>
                    <tr><th>ID</th><th>Name</th></tr>
                </thead>
                <tbody>
                    {allPlayers.map(p => (
                        <tr key={p.id}>
                            <td>{p.id}</td>
                            <td>{playerName(p)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <hr />

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
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
                            {renderPlayerFields(`#${i + 1}`, player, (f, v) => setLineupPlayer(lineupKey, i, f, v))}
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

            <button type="submit">Save Changes</button>
        </form>
    )
}

export default EditGamestate