import { useState } from "react";
import { supabase } from "../supabase-client";
import { type AtBatLog, type PitchingChangeLog, type GameData, type GameLogEntry, type AdditionalInformationLog } from "../types";
import AtBat from "./AtBat";
import PitchingChange from "./PitchingChange";
import Jumbotron from "./Jumbotron";
import AdditionalInformation from "./AdditionalInformation";

type LogType = 'atbat' | 'pitching_change' | 'additional_information';

type GameLoggerProps = {
    gameData: GameData;
    setGameState: React.Dispatch<React.SetStateAction<GameData | null>>;
}

/*
    TODO:
    - Add IPHR and SF to switch case
    - Add baserunner tracking to optimize RBI selection?
    - Add game ending/final screen
*/

function GameLogger({ gameData, setGameState }: GameLoggerProps) {
    const [log, setLog] = useState<GameLogEntry[]>([]);
    const [logType, setLogType] = useState<LogType>('atbat');

    const handleLogAtBat = async (atBat: AtBatLog) => {
        setLog(prev => [...prev, atBat]);
        setGameState(prev => {
            if (!prev) return prev;

            let returnGameState: GameData = { ...prev };

            let outsAdded = 0;
            const sign = atBat.outcomeSign;
            if (sign === 'K' || sign === 'KI' || sign === 'Out in Play') {
                outsAdded = 1;
            }

            let newOuts = returnGameState.numberOfOuts + outsAdded;
            let switchSides = false;

            if (newOuts >= 3) {
                switchSides = true;
                newOuts = 0;
            }

            returnGameState.numberOfOuts = newOuts;

            if (prev.awayTeamBatting) {
                returnGameState.currAwayTeamBatter = (returnGameState.currAwayTeamBatter + 1) % returnGameState.awayTeamLineup.length;
                returnGameState.awayRuns += atBat.rbis;
            } else {
                returnGameState.currHomeTeamBatter = (returnGameState.currHomeTeamBatter + 1) % returnGameState.homeTeamLineup.length;
                returnGameState.homeRuns += atBat.rbis;
            }

            if (switchSides) {
                if (!prev.awayTeamBatting) {
                    returnGameState.inning += 1;
                }
                returnGameState.awayTeamBatting = !prev.awayTeamBatting;
            }

            return returnGameState;
        });

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

    const handleLogAdditionalInformation = (additionalInformation: AdditionalInformationLog) => {
        setLog(prev => [...prev, additionalInformation])
    }

    return (
        <div>
            <Jumbotron
                gameData={gameData}
            />
            <div>
                <label>Types of logs: </label>
                <button onClick={() => setLogType('atbat')}>At Bat</button>
                <button onClick={() => setLogType('pitching_change')}>Pitching Change</button>
                <button onClick={() => setLogType('additional_information')}>Additional Information</button>
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
            {logType === 'additional_information' && (
                <AdditionalInformation
                    onLogAdditionalInformation={handleLogAdditionalInformation}
                />
            )}

            <ul>
                {log.map((entry, index) => {
                    switch (entry.type) {
                        case 'atbat':
                            return <li 
                                key={index}
                            >
                                <span>{entry.batter.lastName}: {entry.outcomeSign}</span>
                                <span>{(entry.rbis > 0) ? ", " + entry.rbis + " RBI" : ""}</span>
                                <span>{(entry.extraComments !== "" ? "; " : "")}</span>
                                <em>{entry.extraComments}</em>
                            </li>
                        case 'pitching_change':
                            return <li key={index}>Pitching change: {entry.newPitcher.lastName} in for {entry.oldPitcher.lastName}</li>
                        case 'additional_information':
                            return <em key={index}>{entry.info}</em>
                }})}
            </ul>
        </div>
    );
}

export default GameLogger
