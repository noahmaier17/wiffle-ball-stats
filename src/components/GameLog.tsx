import { playerNameShort, type AtBatLog, type GameLogEntry } from '../types';
import LogRow from './gameplayLogging/LogRow';

type GameLogProps = {
    log: GameLogEntry[];
    onEditAtBat?: (index: number, entry: AtBatLog) => void;
    editingActive?: boolean;
    editingIndex?: number;
};

function GameLog({ log, onEditAtBat, editingActive, editingIndex }: GameLogProps) {
    const seq = (entry: GameLogEntry) => {
        const s = (entry as any)._seq;
        return window.debugLog && s !== undefined ? <span style={{ color: '#9ca3af', marginRight: '0.4em', fontSize: '0.8em' }}>[{s}]</span> : null;
    };

    return (
        <ul>
            {log.map((entry, index) => {
                switch (entry.type) {
                    case 'atbat':
                        return <li key={index} style={index === editingIndex ? { backgroundColor: '#bfdbfe', borderRadius: '4px', padding: '2px 4px' } : undefined}>
                            {seq(entry)}
                            {onEditAtBat && <><button disabled={editingActive} onClick={() => onEditAtBat(index, entry)}>Edit</button>{" "}</>}
                            <LogRow atBat={entry}/>
                        </li>
                    case 'pitching_change':
                        return <li key={index}>
                            <span>{seq(entry)}{`Pitching change: ${playerNameShort(entry.newPitcher)} in for `}</span>
                            <span>{entry.oldPitcher ? playerNameShort(entry.oldPitcher) : `the ${entry.teamChangingPitchers.charAt(0).toUpperCase() + entry.teamChangingPitchers.slice(1)} team`}</span> 
                        </li>
                    case 'additional_information':
                        return <div key={index}>{seq(entry)}<em>{entry.info}</em></div>
                    case 'inning_switch':
                        return <div key={index}>{seq(entry)}<br /><strong>Switching sides</strong></div>
                    case 'edit_gamestate':
                        return <div key={index}>{seq(entry)}<b><i>Edited Gamestate: {entry.info}</i></b></div>
                }
            })}
        </ul>
    );
}

export default GameLog;