import { useState } from "react";
import { supabase } from "../supabase-client";
import { type AtBatLog, type PitchingChangeLog, type GameData, type GameLogEntry } from "../types";
import AtBat from "./AtBat";
import PitchingChange from "./PitchingChange";

type LogType = 'atbat' | 'pitching_change';

type GameLoggerProps = {
    gameData: GameData;
    setLogAtBatGameData: (atBat: AtBatLog) => void;
    setGameState: React.Dispatch<React.SetStateAction<GameData | null>>;
}

/*
    TODO:
    - Add IPHR and SF to switch case
    - Add baserunner tracking to optimize RBI selection?
    - Add game ending/final screen
*/

function GameLogger({ gameData, setLogAtBatGameData, setGameState }: GameLoggerProps) {
    const [log, setLog] = useState<GameLogEntry[]>([]);
    const [logType, setLogType] = useState<LogType>('atbat');

    const handleLogAtBat = async (atBat: AtBatLog) => {
        setLog(prev => [...prev, atBat]);
        setLogAtBatGameData(atBat);

        const batter = [...gameData.awayTeamLineup, ...gameData.homeTeamLineup].find(p => p === atBat.batter);
        const pitcher = [...gameData.awayTeamLineup, ...gameData.homeTeamLineup].find(p => p === atBat.pitcher);

        if (!batter || !pitcher) return;

        try {
            // Fetch current stats for both players in this game
            const { data: statsData, error: statsError } = await supabase
                .from('player_game_stats')
                .select('*')
                .eq('game_id', gameData.gameId)
                .in('player_id', [batter.id, pitcher.id]);

            if (statsError) throw statsError;

            const batterStats = statsData.find((s: any) => s.player_id === batter.id);
            const pitcherStats = statsData.find((s: any) => s.player_id === pitcher.id);

            // Define increments/decrements for db updates
            let batterDelta: any = { runs_batted_in: atBat.rbis };
            let pitcherDelta: any = { runs_allowed: atBat.rbis };

            const sign = atBat.outcomeSign;
            switch (sign) {
                case 'K':
                case 'KI':
                    batterDelta.at_bats = 1;
                    batterDelta.strikeouts = 1;
                    pitcherDelta.pitched_strikeouts = 1;
                    pitcherDelta.pitched_outs = 1;
                    break;
                case 'Out in Play':
                    batterDelta.at_bats = 1;
                    pitcherDelta.pitched_outs = 1;
                    break;
                case 'BB':
                    batterDelta.walks = 1;
                    pitcherDelta.pitched_walks = 1;
                    break;
                case '1B':
                    batterDelta.at_bats = 1;
                    batterDelta.singles = 1;
                    pitcherDelta.hits_allowed = 1;
                    break;
                case '2B':
                    batterDelta.at_bats = 1;
                    batterDelta.doubles = 1;
                    pitcherDelta.hits_allowed = 1;
                    break;
                case '3B':
                    batterDelta.at_bats = 1;
                    batterDelta.triples = 1;
                    pitcherDelta.hits_allowed = 1;
                    break;
                case 'HR':
                    batterDelta.at_bats = 1;
                    batterDelta.home_runs = 1;
                    batterDelta.runs = 1; // Batter scores a run on a HR
                    pitcherDelta.hits_allowed = 1;
                    break;
            }

            // Update Batter
            if (batterStats) {
                const updatedBatter = { ...batterStats };
                for (const key in batterDelta) {
                    updatedBatter[key] = (updatedBatter[key] || 0) + batterDelta[key];
                }
                delete updatedBatter.innings_pitched; // Avoid writing computed columns
                delete updatedBatter.hits;            // Avoid writing computed columns
                await supabase.from('player_game_stats').update(updatedBatter).eq('id', batterStats.id);
            }

            // Update Pitcher
            if (pitcherStats) {
                const updatedPitcher = { ...pitcherStats };
                for (const key in pitcherDelta) {
                    updatedPitcher[key] = (updatedPitcher[key] || 0) + pitcherDelta[key];
                }
                delete updatedPitcher.innings_pitched; // Avoid writing computed columns
                delete updatedPitcher.hits;            // Avoid writing computed columns
                await supabase.from('player_game_stats').update(updatedPitcher).eq('id', pitcherStats.id);
            }

        } catch (error) {
            console.error("Error updating stats:", error);
        }
    };

    const handleLogPitchingChange = (pitchingChange: PitchingChangeLog) => {
        setLog(prev => [...prev, pitchingChange]);

        setGameState(prev => {
            if (!prev) return prev;

            return ((pitchingChange.teamChangingPitchers === 'away') 
                ? { ...prev, awayPitcher: pitchingChange.newPitcher }
                : { ...prev, homePitcher: pitchingChange.newPitcher })
        })
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
                        ? <li key={index}>{entry.batter.lastName}: {entry.outcomeSign}{(entry.rbis > 0) ? ", " + entry.rbis + " RBI" : ""}</li>
                        : <li key={index}>Pitching change: {entry.newPitcher.lastName} in for {entry.oldPitcher.lastName}</li>
                )}
            </ul>
        </div>
    );
}

export default GameLogger
