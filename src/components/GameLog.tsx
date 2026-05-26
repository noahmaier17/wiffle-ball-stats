import { playerNameShort, type AtBatLog, type GameLogEntry } from '../types';
import LogRow from './gameplayLogging/LogRow';

type GameLogProps = {
    log: GameLogEntry[];
    onEditAtBat?: (index: number, entry: AtBatLog) => void;
    editingActive?: boolean;
    editingIndex?: number;
};

function GameLog({ log, onEditAtBat, editingActive, editingIndex }: GameLogProps) {
    return (
        <ul>
            {log.map((entry, index) => {
                switch (entry.type) {
                    case 'atbat':
                        return <li key={index} style={index === editingIndex ? { backgroundColor: '#bfdbfe', borderRadius: '4px', padding: '2px 4px' } : undefined}>
                            {onEditAtBat && <><button disabled={editingActive} onClick={() => onEditAtBat(index, entry)}>Edit</button>{" "}</>}
                            <LogRow atBat={entry}/>
                        </li>
                    case 'pitching_change':
                        return <li key={index}>Pitching change: {playerNameShort(entry.newPitcher)} in for {playerNameShort(entry.oldPitcher)}</li>
                    case 'additional_information':
                        return <div key={index}><em>{entry.info}</em></div>
                    case 'inning_switch':
                        return <div key={index}><strong>Switching innings</strong></div>
                    case 'edit_gamestate':
                        return <div key={index}><b><i>Edited Gamestate: {entry.info}</i></b></div>
                }
            })}
        </ul>
    );
}

export default GameLog;