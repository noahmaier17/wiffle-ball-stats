import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabase-client";
import { type AtBatLog, type PitchingChangeLog, type GameData, type GameLogEntry, type AdditionalInformationLog, type EditGamestateLog, atBatLogSummary } from "../types";
import { fetchGameLogs, fetchMaxGameLogSequence } from "../utils/fetchGame";
import { retrySupabase } from "../utils/retrySupabase";
import { usePlayers } from "../contexts/PlayersContext";
import AtBat from "./gameplayLogging/AtBat";
import PitchingChange from "./gameplayLogging/PitchingChange";
import Jumbotron from "./Jumbotron";
import AdditionalInformation from "./gameplayLogging/AdditionalInformation";
import EditGamestate from "./gameplayLogging/EditGamestate";
import GameLog from "./GameLog";
import { OUT_IN_PLAY_SIGNS, REACHED_BASE_SIGNS } from "../constants";
import { computeAtBatDeltas } from "../utils/computeAtBatDeltas";

type LogType = 'atbat' | 'pitching_change' | 'additional_information' | 'edit_gamestate';

type GameLoggerProps = {
    gameData: GameData;
    setGameState: React.Dispatch<React.SetStateAction<GameData | null>>;
}

function GameLogger({ gameData, setGameState }: GameLoggerProps) {
    const players = usePlayers();
    const [log, setLog] = useState<GameLogEntry[]>([]);
    const [logType, setLogType] = useState<LogType>('atbat');
    const [editingLog, setEditingLog] = useState<{ index: number; entry: AtBatLog } | null>(null);
    const nextSeqRef = useRef(0);
    const isSubmittingRef = useRef(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const loadLogs = async () => {
            const [logs, nextSeq] = await Promise.all([
                fetchGameLogs(gameData.gameId, players),
                fetchMaxGameLogSequence(gameData.gameId),
            ]);
            if (!logs.length) return;
            setLog(logs);
            nextSeqRef.current = nextSeq;
        };

        loadLogs();
    }, []);

    const retryInsert = async (table: string, data: object): Promise<boolean> => {
        const { error } = await retrySupabase(
            () => supabase.from(table).insert(data),
            table
        );
        return !error;
    };

    const insertLog = async (entry: GameLogEntry): Promise<number> => {
        const sequence = nextSeqRef.current;
        nextSeqRef.current += 1;

        // Creates a new game log entry, and fetches its primary key ID
        const { data: masterRow, error } = await retrySupabase<{ id: number }>(
            () => supabase.from('game_logs').insert({ game_id: gameData.gameId, sequence, type: entry.type }).select('id').single(),
            "Insert Log"
        );

        // Error catching
        if (error || !masterRow) {
            console.error('Failed to insert log entry after 10 attempts:', error);
            return -1;
        }

        const logId = masterRow.id;

        // Depending on the type of log, we append a new log
        switch (entry.type) {
            case 'atbat':
                await retryInsert('at_bat_logs', {
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
                await retryInsert('pitching_change_logs', {
                    log_id: logId,
                    team_changing: entry.teamChangingPitchers,
                    old_pitcher_id: entry.oldPitcher.id,
                    new_pitcher_id: entry.newPitcher.id,
                });
                break;
            case 'additional_information':
                await retryInsert('additional_information_logs', {
                    log_id: logId,
                    info: entry.info,
                    type_of_info: entry.typeOfInfo,
                });
                break;
            case 'inning_switch':
                await retryInsert('inning_switch_logs', { log_id: logId });
                break;
            case 'edit_gamestate':
                await retryInsert('edit_gamestate_logs', {
                    log_id: logId,
                    info: entry.info,
                    new_game_data: entry.newGameData,
                });
                break;
        }

        return logId;
    };

    const handleLogAtBat = async (atBat: AtBatLog) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setIsSubmitting(true);

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

        // Compute queue mutations and earned runs synchronously before any state updates
        let workingQueue: [number, number][] = gameData.earnedRunsQueue.map(([id, count]) => [id, count]);

        if (REACHED_BASE_SIGNS.has(atBat.outcomeSign)) {
            if (workingQueue.length === 0 || workingQueue[0][0] !== atBat.pitcher.id) {
                workingQueue = [[atBat.pitcher.id, 1], ...workingQueue];
            } else {
                workingQueue = [[workingQueue[0][0], workingQueue[0][1] + 1], ...workingQueue.slice(1)];
            }
        }

        const pitcherIdHasEarnedRun: number[] = [];
        for (let i = 0; i < atBat.rbis; i++) {
            if (workingQueue.length === 0) break;
            const [back_pitcher_id, back_on_base] = workingQueue.at(-1)!;
            pitcherIdHasEarnedRun.push(back_pitcher_id);
            workingQueue = back_on_base === 1
                ? workingQueue.slice(0, -1)
                : [...workingQueue.slice(0, -1), [back_pitcher_id, back_on_base - 1]];
        }

        const finalQueue = workingQueue;

        // Sets the game state variable
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

            // 3. Update number on base and earned runs queue
            let numberOnBase: number = 0;

            // If we reached base, we have 1 more on, minus all that were removed from whatever manner
            if (REACHED_BASE_SIGNS.has(atBat.outcomeSign)) numberOnBase += 1 - atBat.rbis - atBat.recordedOuts;
            // If we did not reach base but the ball is in play, we exclude removing the runner (so +1) but remove all past them
            if (OUT_IN_PLAY_SIGNS.has(atBat.outcomeSign)) numberOnBase += 1 - atBat.recordedOuts;

            returnGameState.numberOnBase += numberOnBase;
            returnGameState.earnedRunsQueue = finalQueue;

            // 4. Handle switching innings
            if (switchSides && !gameJustEnded) {
                returnGameState.numberOnBase = 0;
                returnGameState.earnedRunsQueue = [];

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

        try {
            const logId = await insertLog(atBat);
            if (switchSides) await insertLog({ type: 'inning_switch' });

            // Patch the log entry in state with the real DB logId
            setLog(prev => prev.map(e => (e === atBat ? { ...e, logId } : e)));

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

                // Update pitchers with earned runs
                const earnedRunsPerPitcher = new Map<number, number>();
                for (const id of pitcherIdHasEarnedRun) {
                    earnedRunsPerPitcher.set(id, (earnedRunsPerPitcher.get(id) ?? 0) + 1);
                }

                await Promise.all(
                    [...earnedRunsPerPitcher.entries()].map(async ([pitcher_id, count]) => {
                        const { data } = await supabase
                            .from('player_game_stats')
                            .select('id, runs_allowed')
                            .eq('game_id', gameData.gameId)
                            .eq('player_id', pitcher_id)
                            .single();
                        await retrySupabase(() => supabase
                            .from('player_game_stats')
                            .update({ runs_allowed: data!.runs_allowed + count })
                            .eq('id', data!.id),
                            "Set runs allowed");
                    })
                );

                const { batterDelta, pitcherDelta } = computeAtBatDeltas(atBat.outcomeSign, atBat.rbis, atBat.recordedOuts);

                // Update Batter
                if (batterStats) {
                    const batterUpdate: any = {};
                    for (const key in batterDelta) {
                        batterUpdate[key] = (batterStats[key] || 0) + batterDelta[key];
                    }
                    await retrySupabase(() => supabase
                        .from('player_game_stats')
                        .update(batterUpdate)
                        .eq('id', batterStats.id),
                        "Update batter"
                    );
                }

                // Update Pitcher
                if (pitcherStats) {
                    const pitcherUpdate: any = { games_pitched: 1 };
                    for (const key in pitcherDelta) {
                        pitcherUpdate[key] = (pitcherStats[key] || 0) + pitcherDelta[key];
                    }
                    await retrySupabase(() => supabase
                        .from('player_game_stats')
                        .update(pitcherUpdate)
                        .eq('id', pitcherStats.id),
                        "Update pitcher"
                    );
                }

                // Update wins/losses for all players when the game ends
                if (gameJustEnded) {
                    const winnerLineup = homeTeamWon ? gameData.homeTeamLineup : gameData.awayTeamLineup;
                    const loserLineup = homeTeamWon ? gameData.awayTeamLineup : gameData.homeTeamLineup;
                    await retrySupabase(() => supabase.from('player_game_stats')
                        .update({ win: 1 })
                        .eq('game_id', gameData.gameId)
                        .in('player_id', winnerLineup.map(p => p.id)),
                        "Update wins"
                    );
                    await retrySupabase(() => supabase.from('player_game_stats')
                        .update({ loss: 1 })
                        .eq('game_id', gameData.gameId)
                        .in('player_id', loserLineup.map(p => p.id)),
                        "Update losses"
                    );
                }

            } catch (error) {
                console.error("Error updating stats:", error);
            }
        } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
    };

    const handleLogPitchingChange = async (pitchingChange: PitchingChangeLog) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setIsSubmitting(true);

        setLog(prev => [...prev, pitchingChange]);

        setGameState(prev => {
            if (!prev) return prev;
            return (pitchingChange.teamChangingPitchers === 'away')
                ? { ...prev, awayPitcher: pitchingChange.newPitcher }
                : { ...prev, homePitcher: pitchingChange.newPitcher };
        });

        try {
            await insertLog(pitchingChange);
        } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
    };

    const handleLogAdditionalInformation = async (additionalInformation: AdditionalInformationLog) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setIsSubmitting(true);

        setLog(prev => [...prev, additionalInformation]);

        try {
            await insertLog(additionalInformation);
        } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
    };

    const handleStartEditAtBat = (index: number, entry: AtBatLog) => {
        setEditingLog({ index, entry });
    };

    const handleSaveAtBatEdit = async (newAtBat: AtBatLog) => {
        if (!editingLog) return;
        const { index, entry: oldAtBat } = editingLog;

        const editNote = `Edited: ${atBatLogSummary(oldAtBat)}`;
        const appendedComments = newAtBat.extraComments
            ? `${newAtBat.extraComments}; ${editNote}`
            : editNote;
        const finalAtBat = { ...newAtBat, extraComments: appendedComments };

        setLog(prev => prev.map((e, i) => i === index ? finalAtBat : e));
        setEditingLog(null);

        await retrySupabase(
            () => supabase.from('at_bat_logs').update({
                outcome_sign: finalAtBat.outcomeSign,
                rbis: finalAtBat.rbis,
                recorded_outs: finalAtBat.recordedOuts,
                extra_comments: finalAtBat.extraComments,
            }).eq('log_id', oldAtBat.logId),
            "Edit at bat"
        );

        const oldDeltas = computeAtBatDeltas(oldAtBat.outcomeSign, oldAtBat.rbis, oldAtBat.recordedOuts);
        const newDeltas = computeAtBatDeltas(newAtBat.outcomeSign, newAtBat.rbis, newAtBat.recordedOuts);

        const { data: statsData } = await supabase
            .from('player_game_stats')
            .select('*')
            .eq('game_id', gameData.gameId)
            .in('player_id', [oldAtBat.batter.id, oldAtBat.pitcher.id]);

        const batterStats = statsData?.find((s: any) => s.player_id === oldAtBat.batter.id);
        const pitcherStats = statsData?.find((s: any) => s.player_id === oldAtBat.pitcher.id);

        if (batterStats) {
            const update: any = {};
            const allKeys = new Set([...Object.keys(oldDeltas.batterDelta), ...Object.keys(newDeltas.batterDelta)]);
            for (const key of allKeys) {
                update[key] = (batterStats[key] || 0) - (oldDeltas.batterDelta[key] || 0) + (newDeltas.batterDelta[key] || 0);
            }
            await retrySupabase(
                () => supabase
                    .from('player_game_stats')
                    .update(update)
                    .eq('id', batterStats.id),
                "Update batter stats on edit"
            );
        }

        if (pitcherStats) {
            const update: any = {};
            const allKeys = new Set([...Object.keys(oldDeltas.pitcherDelta), ...Object.keys(newDeltas.pitcherDelta)]);
            for (const key of allKeys) {
                update[key] = (pitcherStats[key] || 0) - (oldDeltas.pitcherDelta[key] || 0) + (newDeltas.pitcherDelta[key] || 0);
            }
            await retrySupabase(
                () => supabase
                    .from('player_game_stats')
                    .update(update)
                    .eq('id', pitcherStats.id),
                "Update pitcher stats on edit"
            );
        }
    };

    const handleEditGamestate = async (editGamestateLog: EditGamestateLog) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setIsSubmitting(true);

        setLog(prev => [...prev, editGamestateLog]);
        setGameState(editGamestateLog.newGameData);

        try {
            await insertLog(editGamestateLog);
        } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
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

            {editingLog !== null ? (
                <AtBat
                    gameData={gameData}
                    onLogAtBat={handleLogAtBat}
                    isSubmitting={isSubmitting}
                    editMode={{
                        initialValues: editingLog.entry,
                        onEditAtBat: handleSaveAtBatEdit,
                        onCancel: () => setEditingLog(null),
                    }}
                />
            ) : (
                <>
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
                            isSubmitting={isSubmitting}
                        />
                    )}
                    {logType === 'pitching_change' && (
                        <PitchingChange
                            gameData={gameData}
                            onLogPitchingChange={handleLogPitchingChange}
                            isSubmitting={isSubmitting}
                        />
                    )}
                    {logType === 'additional_information' && (
                        <AdditionalInformation
                            onLogAdditionalInformation={handleLogAdditionalInformation}
                            isSubmitting={isSubmitting}
                        />
                    )}
                    {logType === 'edit_gamestate' && (
                        <EditGamestate
                            gameData={gameData}
                            onUpdate={handleEditGamestate}
                            isSubmitting={isSubmitting}
                        />
                    )}
                </>
            )}

            <GameLog log={log} onEditAtBat={handleStartEditAtBat} editingActive={editingLog !== null || isSubmitting} editingIndex={editingLog?.index} />
        </div>
    );
}

export default GameLogger
