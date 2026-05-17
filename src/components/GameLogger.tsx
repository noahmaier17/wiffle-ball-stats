import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabase-client";
import { type AtBatLog, type PitchingChangeLog, type GameData, type GameLogEntry, type AdditionalInformationLog, type EditGamestateLog, type Player, rowToLogEntry, makeFindPlayer } from "../types";
import AtBat from "./AtBat";
import PitchingChange from "./PitchingChange";
import Jumbotron from "./Jumbotron";
import AdditionalInformation from "./AdditionalInformation";
import EditGamestate from "./EditGamestate";
import GameLog from "./GameLog";

type LogType = 'atbat' | 'pitching_change' | 'additional_information' | 'edit_gamestate';

type GameLoggerProps = {
    gameData: GameData;
    setGameState: React.Dispatch<React.SetStateAction<GameData | null>>;
}

function GameLogger({ gameData, setGameState }: GameLoggerProps) {
    const [log, setLog] = useState<GameLogEntry[]>([]);
    const [logType, setLogType] = useState<LogType>('atbat');
    const nextSeqRef = useRef(0);
    const isSubmittingRef = useRef(false);

    useEffect(() => {
        const loadLogs = async () => {
            // Fetches our database game logs and player information
            const [{ data: rows }, { data: playersData }] = await Promise.all([
                supabase
                    .from('game_logs')
                    .select(`
                        id, sequence, type,
                        at_bat_logs(batter_id, pitcher_id, outcome_sign, rbis, recorded_outs, inning, extra_comments),
                        pitching_change_logs(team_changing, old_pitcher_id, new_pitcher_id),
                        additional_information_logs(info, type_of_info),
                        edit_gamestate_logs(info, new_game_data),
                        inning_switch_logs(log_id)
                    `)
                    .eq('game_id', gameData.gameId)
                    .order('sequence'),

                supabase.from('players').select('id, first_name, last_name')
            ]);

            // If we did not fetch data, returns
            if (!rows?.length || !playersData) return;

            // Gets our players
            const players: Player[] = playersData.map((p: any) => ({
                id: p.id,
                firstName: p.first_name,
                lastName: p.last_name,
            }));
            const findPlayer = makeFindPlayer(players);

            // Sets the log with what is already present in it
            setLog(rows.map((row: any) => rowToLogEntry(row, findPlayer)));
            nextSeqRef.current = rows.length;
        };

        loadLogs();
    }, []);

    const insertLog = async (entry: GameLogEntry): Promise<void> => {
        const sequence = nextSeqRef.current;
        nextSeqRef.current += 1;

        // Creates a new game log entry, and fetches its primary key ID
        const { data: masterRow, error } = await supabase
            .from('game_logs')
            .insert({ game_id: gameData.gameId, sequence, type: entry.type })
            .select('id')
            .single();

        // Error catching
        if (error || !masterRow) {
            console.error('Failed to insert log entry:', error);
            return;
        }

        const logId = masterRow.id;

        // Depending on the type of log, we append a new log
        switch (entry.type) {
            case 'atbat':
                await supabase.from('at_bat_logs').insert({
                    log_id: logId,
                    batter_id: entry.batter.id,
                    pitcher_id: entry.pitcher.id,
                    outcome_sign: entry.outcomeSign,
                    rbis: entry.rbis,
                    recorded_outs: entry.recordedOuts,
                    inning: gameData.inning,
                    extra_comments: entry.extraComments ?? '',
                });
                break;
            case 'pitching_change':
                await supabase.from('pitching_change_logs').insert({
                    log_id: logId,
                    team_changing: entry.teamChangingPitchers,
                    old_pitcher_id: entry.oldPitcher.id,
                    new_pitcher_id: entry.newPitcher.id,
                });
                break;
            case 'additional_information':
                await supabase.from('additional_information_logs').insert({
                    log_id: logId,
                    info: entry.info,
                    type_of_info: entry.typeOfInfo,
                });
                break;
            case 'inning_switch':
                await supabase.from('inning_switch_logs').insert({ log_id: logId });
                break;
            case 'edit_gamestate':
                await supabase.from('edit_gamestate_logs').insert({
                    log_id: logId,
                    info: entry.info,
                    new_game_data: entry.newGameData,
                });
                break;
        }
    };

    const handleLogAtBat = async (atBat: AtBatLog) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;

        let newOuts = gameData.numberOfOuts + atBat.recordedOuts;
        let switchSides = false;

        if (newOuts >= 3) {
            switchSides = true;
            newOuts = 0;
        }

        const awayBatting = gameData.awayTeamBatting;
        const inning = gameData.inning;
        const newAwayRuns = gameData.awayRuns + (awayBatting ? atBat.rbis : 0);
        const newHomeRuns = gameData.homeRuns + (!awayBatting ? atBat.rbis : 0);

        let gameJustEnded = false;
        if (!awayBatting && inning >= 3 && newHomeRuns > newAwayRuns) {
            gameJustEnded = true;
        }
        if (switchSides && !gameJustEnded) {
            if (awayBatting && inning >= 3 && newHomeRuns > newAwayRuns) gameJustEnded = true;
            if (!awayBatting && inning >= 3 && newAwayRuns !== newHomeRuns) gameJustEnded = true;
        }
        const homeTeamWon = newHomeRuns > newAwayRuns;

        setLog(prev => switchSides ? [...prev, atBat, { type: 'inning_switch' }] : [...prev, atBat]);

        setGameState(prev => {
            if (!prev) return prev;

            let returnGameState: GameData = { ...prev };

            // 1. Update outs
            returnGameState.numberOfOuts = newOuts;

            // 2. Update runs and advance batter
            if (awayBatting) {
                returnGameState.currAwayTeamBatter = (returnGameState.currAwayTeamBatter + 1) % returnGameState.awayTeamLineup.length;
                returnGameState.awayRuns = newAwayRuns;
            } else {
                returnGameState.currHomeTeamBatter = (returnGameState.currHomeTeamBatter + 1) % returnGameState.homeTeamLineup.length;
                returnGameState.homeRuns = newHomeRuns;
            }

            // 3. Handle switching innings
            if (switchSides && !gameJustEnded) {
                if (!awayBatting) {
                    returnGameState.inning += 1;
                }
                returnGameState.awayTeamBatting = !awayBatting;
            }

            if (gameJustEnded) {
                returnGameState.isGameOver = true;
            }

            return returnGameState;
        });

        isSubmittingRef.current = false;

        insertLog(atBat);
        if (switchSides) insertLog({ type: 'inning_switch' });

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
            let batterDelta: any = { runs_batted_in: atBat.rbis };
            let pitcherDelta: any = { runs_allowed: atBat.rbis };

            // Stat changes
            batterDelta.plate_appearances = 1;
            pitcherDelta.pitched_outs = atBat.recordedOuts
            batterDelta.at_bats = 1; // Except walk
            switch (atBat.outcomeSign) {
                case 'reverse-K':
                    batterDelta.strikeouts = 1;
                    batterDelta.strikeouts_looking = 1;
                    pitcherDelta.pitched_strikeouts = 1;
                    pitcherDelta.pitched_strikeouts_looking = 1;
                    break;
                case 'K':
                    batterDelta.strikeouts = 1;
                    batterDelta.strikeouts_swinging = 1;
                    pitcherDelta.pitched_strikeouts = 1;
                    pitcherDelta.pitched_strikeouts_swinging = 1;
                    break;
                case 'BB':
                    batterDelta.at_bats = 0; // 0 for a walk
                    batterDelta.walks = 1;
                    pitcherDelta.pitched_walks = 1;
                    break;
                case '1B':
                    batterDelta.hits = 1;
                    batterDelta.singles = 1;
                    pitcherDelta.hits_allowed = 1;
                    break;
                case '2B':
                    batterDelta.hits = 1;
                    batterDelta.doubles = 1;
                    pitcherDelta.hits_allowed = 1;
                    break;
                case '3B':
                    batterDelta.hits = 1;
                    batterDelta.triples = 1;
                    pitcherDelta.hits_allowed = 1;
                    break;
                case 'HR':
                    batterDelta.hits = 1;
                    batterDelta.home_runs = 1;
                    pitcherDelta.hits_allowed = 1;
                    pitcherDelta.home_runs_allowed = 1;
                    break
                case 'IPHR':
                    batterDelta.hits = 1;
                    batterDelta.home_runs = 1;
                    batterDelta.inside_the_park_home_runs = 1;
                    pitcherDelta.hits_allowed = 1;
                    // Home runs allowed does not count IPHR
                    break;
                case 'FC':
                    batterDelta.fielders_choice = 1;
            }

            // Update Batter
            if (batterStats) {
                const updatedBatter = { ...batterStats };
                for (const key in batterDelta) {
                    updatedBatter[key] = (updatedBatter[key] || 0) + batterDelta[key];
                }
                await supabase.from('player_game_stats').update(updatedBatter).eq('id', batterStats.id);
            }

            // Update Pitcher
            if (pitcherStats) {
                const updatedPitcher = { ...pitcherStats };
                for (const key in pitcherDelta) {
                    updatedPitcher[key] = (updatedPitcher[key] || 0) + pitcherDelta[key];
                }
                updatedPitcher.games_pitched = 1; // They pitched this game
                await supabase.from('player_game_stats').update(updatedPitcher).eq('id', pitcherStats.id);
            }

            // Update wins/losses for all players when the game ends
            if (gameJustEnded) {
                const winnerLineup = homeTeamWon ? gameData.homeTeamLineup : gameData.awayTeamLineup;
                const loserLineup = homeTeamWon ? gameData.awayTeamLineup : gameData.homeTeamLineup;
                await supabase.from('player_game_stats')
                    .update({ win: 1 })
                    .eq('game_id', gameData.gameId)
                    .in('player_id', winnerLineup.map(p => p.id));
                await supabase.from('player_game_stats')
                    .update({ loss: 1 })
                    .eq('game_id', gameData.gameId)
                    .in('player_id', loserLineup.map(p => p.id));
            }

        } catch (error) {
            console.error("Error updating stats:", error);
        }
    };

    const handleLogPitchingChange = (pitchingChange: PitchingChangeLog) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;

        setLog(prev => [...prev, pitchingChange]);

        setGameState(prev => {
            if (!prev) return prev;
            return (pitchingChange.teamChangingPitchers === 'away')
                ? { ...prev, awayPitcher: pitchingChange.newPitcher }
                : { ...prev, homePitcher: pitchingChange.newPitcher };
        });

        isSubmittingRef.current = false;

        insertLog(pitchingChange);
    };

    const handleLogAdditionalInformation = (additionalInformation: AdditionalInformationLog) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;

        setLog(prev => [...prev, additionalInformation]);

        isSubmittingRef.current = false;

        insertLog(additionalInformation);
    };

    const handleEditGamestate = (editGamestateLog: EditGamestateLog) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;

        setLog(prev => [...prev, editGamestateLog]);
        setGameState(editGamestateLog.newGameData);

        isSubmittingRef.current = false;

        insertLog(editGamestateLog);
    };

    return (
        <div>
            <button onClick={() => setGameState(null)}>← Back</button>
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

            <GameLog log={log} />
        </div>
    );
}

export default GameLogger
