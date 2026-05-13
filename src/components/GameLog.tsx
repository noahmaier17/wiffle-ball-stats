import { playerNameShort, type GameLogEntry } from '../types';

type GameLogProps = {
    log: GameLogEntry[];
};

function GameLog({ log }: GameLogProps) {
    return (
        <ul>
            {log.map((entry, index) => {
                switch (entry.type) {
                    case 'atbat':
                        return <li key={index}>
                            <span>{playerNameShort(entry.batter)}: {entry.outcomeSign}</span>
                            <span>{(entry.rbis > 0) ? ", " + entry.rbis + " RBI" : ""}</span>
                            <span>{(entry.extraComments !== "" ? "; " : "")}</span>
                            {entry.recordedOuts > 0 && <span>{" (outs: " + entry.recordedOuts + ") "}</span>}
                            <em>{entry.extraComments}</em>
                        </li>
                    case 'pitching_change':
                        return <li key={index}>Pitching change: {entry.newPitcher.lastName} in for {entry.oldPitcher.lastName}</li>
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