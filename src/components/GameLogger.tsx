import { useEffect, useState } from "react";
import { supabase } from "../supabase-client";
import { type AtBatLog, type PitchingChangeLog, type GameData, type GameLogEntry, type AdditionalInformationLog, type EditGamestateLog } from "../types";
import AtBat from "./AtBat";
import PitchingChange from "./PitchingChange";
import Jumbotron from "./Jumbotron";
import AdditionalInformation from "./AdditionalInformation";
import EditGamestate from "./EditGamestate";

type LogType = 'atbat' | 'pitching_change' | 'additional_information' | 'edit_gamestate';

type GameLoggerProps = {
    gameData: GameData;
    setGameState: React.Dispatch<React.SetStateAction<GameData | null>>;
}

/*
    TODO:
    - Add IPHR and SF to switch case
    - Add game ending/final screen
*/

function GameLogger({ gameData, setGameState }: GameLoggerProps) {
    const [log, setLog] = useState<GameLogEntry[]>([]);
    const [logType, setLogType] = useState<LogType>('atbat');

    /* Debugging use Effects */

    useEffect(() => {
        console.log(log);
    }, [log])

    /* --------------------- */

    useEffect(() => {
        supabase
            .from('games')
            .select('logs')
            .eq('id', gameData.gameId)
            .single()
            .then(({ data }) => {
                if (data?.logs?.length) setLog(data.logs);
            });
    }, []);

    useEffect(() => {
        if (log.length === 0) return;

        supabase
            .from('games')
            .update({ logs: log })
            .eq('id', gameData.gameId)
            .then(({ error }) => console.log('logs update error:', error));
    }, [log])

    const handleLogAtBat = async (atBat: AtBatLog) => {
        setLog(prev => [...prev, atBat]);

        let newOuts = gameData.numberOfOuts + atBat.recordedOuts;
        let switchSides = false;

        if (newOuts >= 3) {
            switchSides = true;
            newOuts = 0;

            setLog(prev => [...prev, {
                type: 'inning_switch'
            }]);
        }

        setGameState(prev => {
            if (!prev) return prev;

            let returnGameState: GameData = { ...prev };

            // 1. Update outs
            returnGameState.numberOfOuts = newOuts;

            // 2. Update rbis and batters
            if (prev.awayTeamBatting) {
                returnGameState.currAwayTeamBatter = (returnGameState.currAwayTeamBatter + 1) % returnGameState.awayTeamLineup.length;
                returnGameState.awayRuns += atBat.rbis;
            } else {
                returnGameState.currHomeTeamBatter = (returnGameState.currHomeTeamBatter + 1) % returnGameState.homeTeamLineup.length;
                returnGameState.homeRuns += atBat.rbis;
            }

            let isGameOver = false;

            // Check Walk-off
            if (!prev.awayTeamBatting && returnGameState.inning >= 3 && returnGameState.homeRuns > returnGameState.awayRuns) {
                isGameOver = true;
            }

            // 3. Handle switching innings
            if (switchSides && !isGameOver) {
                if (prev.awayTeamBatting) {
                    // Middle of the 3rd or later: if Home is already ahead, game over
                    if (returnGameState.inning >= 3 && returnGameState.homeRuns > returnGameState.awayRuns) {
                        isGameOver = true;
                    }
                } else {
                    // End of the 3rd or later: if not tied, game over
                    if (returnGameState.inning >= 3 && returnGameState.awayRuns !== returnGameState.homeRuns) {
                        isGameOver = true;
                    }
                }

                if (!isGameOver) {
                    if (!prev.awayTeamBatting) {
                        returnGameState.inning += 1;
                    }
                    returnGameState.awayTeamBatting = !prev.awayTeamBatting;
                }
            }

            if (isGameOver) {
                returnGameState.isGameOver = true;
            }

            return returnGameState;
        });

        const batter = atBat.batter;
        const pitcher = atBat.pitcher;

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
            let batterDelta: any = { runs_batted_in: atBat.rbis, plate_appearances: 1 };
            let pitcherDelta: any = { runs_allowed: atBat.rbis };

            batterDelta.plate_appearances = 1;
            batterDelta.at_bats = 1; // Except walk
            switch (atBat.outcomeSign) {
                case 'reverse-K':
                case 'K':
                    batterDelta.strikeouts = 1;
                    pitcherDelta.pitched_strikeouts = 1;
                    pitcherDelta.pitched_outs = 1;
                    break;
                case 'Out':
                    pitcherDelta.pitched_outs = 1;
                    break;
                case 'BB':
                    batterDelta.at_bats = 0; // 0 for a walk
                    batterDelta.walks = 1;
                    pitcherDelta.pitched_walks = 1;
                    break;
                case '1B':
                    batterDelta.singles = 1;
                    pitcherDelta.hits_allowed = 1;
                    break;
                case '2B':
                    batterDelta.doubles = 1;
                    pitcherDelta.hits_allowed = 1;
                    break;
                case '3B':
                    batterDelta.triples = 1;
                    pitcherDelta.hits_allowed = 1;
                    break;
                case 'HR':
                case 'IPHR':
                    batterDelta.at_bats = 1;
                    batterDelta.home_runs = 1;
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

    const handleEditGamestate = (editGamestateLog: EditGamestateLog) => {
        setGameState(editGamestateLog.newGameData);
    }

    return (
        <div>
            <Jumbotron
                gameData={gameData}
            />

            <hr></hr>

            {gameData.isGameOver && (
                <div className="popup-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
                    justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div style={{ textAlign: "center", padding: "3em", backgroundColor: "#1f2937", borderRadius: "12px", border: "1px solid #374151", color: "white", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)", minWidth: "300px" }}>
                        <h2 style={{ marginTop: 0 }}>Game Over!</h2>
                        <p style={{ fontSize: "1.2rem", margin: "1em 0" }}>Final Score:<br />Away {gameData.awayRuns} - {gameData.homeRuns} Home</p>
                        <button
                            onClick={() => setGameState(null)}
                            style={{ padding: "10px 20px", backgroundColor: "#3b82f6", color: "white", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold", marginTop: "10px" }}
                        >
                            Return to Menu
                        </button>
                    </div>
                </div>
            )}

            <div style={{ paddingBottom: "1em" }}>
                <h3>Types of logs: </h3>
                <div className="radio-group radio-group--fill">
                    <label>
                        <input
                            type="radio"
                            name="logType"
                            value="atbat"
                            checked={logType === 'atbat'}
                            onChange={() => setLogType('atbat')}
                        />
                        At Bat
                    </label>
                    <label>
                        <input
                            type="radio"
                            name="logType"
                            value="pitching_change"
                            checked={logType === 'pitching_change'}
                            onChange={() => setLogType('pitching_change')}
                        />
                        Pitching Change
                    </label>
                    <label>
                        <input
                            type="radio"
                            name="logType"
                            value="additional_information"
                            checked={logType === 'additional_information'}
                            onChange={() => setLogType('additional_information')}
                        />
                        Additional Information
                    </label>
                    <label>
                        <input
                            type="radio"
                            name="logType"
                            value="edit_gamestate"
                            checked={logType === 'edit_gamestate'}
                            onChange={() => setLogType('edit_gamestate')}
                        />
                        Edit Gamestate
                    </label>
                </div>
            </div>

            <hr></hr>

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
            {logType === 'edit_gamestate' && (
                <EditGamestate
                    gameData={gameData}
                    onUpdate={handleEditGamestate}
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
                        case 'inning_switch':
                            return <strong key={index}>Switching innings</strong>
                    }
                })}
            </ul>
        </div>
    );
}

export default GameLogger
