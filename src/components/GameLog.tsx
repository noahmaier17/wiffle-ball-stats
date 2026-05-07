import type { GameLogEntry } from '../types';

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
                            <span>{entry.batter.lastName}: {entry.outcomeSign}</span>
                            <span>{(entry.rbis > 0) ? ", " + entry.rbis + " RBI" : ""}</span>
                            <span>{(entry.extraComments !== "" ? "; " : "")}</span>
                            <em>{entry.extraComments}</em>
                        </li>
                    case 'pitching_change':
                        return <li key={index}>Pitching change: {entry.newPitcher.lastName} in for {entry.oldPitcher.lastName}</li>
                    case 'additional_information':
                        return <em key={index}>{entry.info}</em>
                    case 'inning_switch':
                        return <strong key={index}>Switching innings</strong>
                }
            })}
        </ul>
    );
}

export default GameLog;