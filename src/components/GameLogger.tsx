import { useState } from "react";
import type { AtBatLog, PitchingChangeLog, GameData, GameLogEntry } from "../types";
import AtBat from "./AtBat";
import PitchingChange from "./PitchingChange";

type LogType = 'atbat' | 'pitching_change';

type GameLoggerProps = {
    gameData: GameData;
    onUpdateGameState: (atBat: AtBatLog) => void;
}

function GameLogger({ gameData, onUpdateGameState }: GameLoggerProps) {
    const [log, setLog] = useState<GameLogEntry[]>([]);
    const [logType, setLogType] = useState<LogType>('atbat');

    const handleLogAtBat = (atBat: AtBatLog) => {
        setLog(prev => [...prev, atBat]);
        onUpdateGameState(atBat);
    };

    const handleLogPitchingChange = (pitchingChange: PitchingChangeLog) => {
        setLog(prev => [...prev, pitchingChange]);

        // TODO: need to do set game data
    };

    return (
        <div>
            <div>
                <button onClick={() => setLogType('atbat')}>Log At Bat</button>
                <button onClick={() => setLogType('pitching_change')}>Log Pitching Change</button>
            </div>

            {logType === 'atbat' && (
                <AtBat 
                    gameData={gameData} 
                    onLogAtBat={handleLogAtBat} 
                />
            )}
            {logType === 'pitching_change' && (
                <PitchingChange 
                    gameData={gameData} 
                    onLogPitchingChange={handleLogPitchingChange}
                />
            )}

            <ul>
                {log.map((entry, index) =>
                    entry.type === 'atbat'
                        ? <li key={index}>{entry.batter}: {entry.rbis}-run {entry.outcomeSign}</li>
                        : <li key={index}>Pitching change: {entry.newPitcher} subs in for {entry.oldPitcher}</li>
                )}
            </ul>
        </div>
    );
}

export default GameLogger
