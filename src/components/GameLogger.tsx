import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabase-client";
import { type AtBatLog, type PitchingChangeLog, type GameData, type GameLogEntry, type AdditionalInformationLog, type EditGamestateLog, atBatLogSummary } from "../types";
import { fetchGameLogs, fetchMaxGameLogSequence } from "../utils/fetchGame";
import { retrySupabase, retryInsert } from "../utils/retrySupabase";
import { usePlayers } from "../contexts/PlayersContext";
import AtBat from "./gameplayLogging/AtBat";
import PitchingChange from "./gameplayLogging/PitchingChange";
import Jumbotron from "./Jumbotron";
import AdditionalInformation from "./gameplayLogging/AdditionalInformation";
import EditGamestate from "./gameplayLogging/EditGamestate";
import GameLog from "./GameLog";
import { OUT_IN_PLAY_SIGNS, REACHED_BASE_SIGNS, STRIKEOUT_SIGNS } from "../constants";
import { computeAtBatDeltas } from "../utils/computeAtBatDeltas";
import { addToQueue, dequeueRun } from "../utils/earnedRunsQueueUtils";

type LogType = 'atbat' | 'pitching_change' | 'additional_information' | 'edit_gamestate';

type GameLoggerProps = {
    gameData: GameData;
    setGameState: React.Dispatch<React.SetStateAction<GameData | null>>;
}

function GameLogger({ gameData, setGameState }: GameLoggerProps) {
    const players = usePlayers();
    const [log, setLog] = useState<GameLogEntry[]>([]);
    const [logType, setLogType] = useState<LogType>(() => {
        const initPitcher = gameData.awayTeamBatting ? gameData.homePitcher : gameData.awayPitcher;
        return initPitcher ? 'atbat' : 'pitching_change';
    });
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

    const insertLogToDB = async (entry: GameLogEntry): Promise<number> => {
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
                    old_pitcher_id: entry.oldPitcher?.id ?? null,
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

    const updateGameStateInDB = async (state: GameData, setFinishTime=false) => {
        await retrySupabase(
            () => supabase.from('games').update({
                home_score: state.homeRuns,
                away_score: state.awayRuns,
                away_pitcher_id: state.awayPitcher?.id ?? null,
                home_pitcher_id: state.homePitcher?.id ?? null,
                away_team_lineup_ids: state.awayTeamLineup.map(p => p.id),
                home_team_lineup_ids: state.homeTeamLineup.map(p => p.id),
                away_alltime_defense_ids: state.awayAlltimeDefensePlayers.map(p => p.id),
                home_alltime_defense_ids: state.homeAlltimeDefensePlayers.map(p => p.id),
                away_team_is_batting: state.awayTeamBatting,
                inning: state.inning,
                number_of_outs: state.numberOfOuts,
                current_away_team_batter_index: state.currAwayTeamBatter,
                current_home_team_batter_index: state.currHomeTeamBatter,
                number_on_base: state.numberOnBase,
                earned_runs_queue: state.earnedRunsQueue,
                game_over: state.isGameOver,
                ...(setFinishTime ? { finish_time: new Date().toISOString() } : {}),
            }).eq('id', state.gameId),
            "Update game state"
        );
    };

    const handleLogAtBat = async (atBat: AtBatLog) => {
        // We do not log an at bat if we are still actively submitting
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setIsSubmitting(true);

        // Calculates new outs totals and if we are switching sides
        let newOuts = gameData.numberOfOuts + atBat.recordedOuts;
        let switchSides = false;

        if (newOuts >= 3) {
            switchSides = true;
            newOuts = 0;
        }

        // Variables
        const awayBatting = gameData.awayTeamBatting;
        const inning = gameData.inning;
        const newAwayRuns = gameData.awayRuns + (awayBatting ? atBat.rbis : 0);
        const newHomeRuns = gameData.homeRuns + (!awayBatting ? atBat.rbis : 0);

        // Handles if the game ended or not
        let gameJustEnded = false;
        if (!awayBatting && inning >= 3 && newHomeRuns > newAwayRuns) {
            gameJustEnded = true;
        }
        if (switchSides && !gameJustEnded) {
            if (awayBatting && inning >= 3 && newHomeRuns > newAwayRuns) gameJustEnded = true;
            if (!awayBatting && inning >= 3 && newAwayRuns !== newHomeRuns) gameJustEnded = true;
        }
        const homeTeamWon = newHomeRuns > newAwayRuns;

        // Handles if we have an inning switch
        setLog(prev => switchSides ? [...prev, atBat, { type: 'inning_switch' }] : [...prev, atBat]);

        // Compute queue mutations and earned runs synchronously before any state updates in our setGameState call
        let workingQueue: number[] = [...gameData.earnedRunsQueue];
        const pitcherIdHasEarnedRun: number[] = [];

        // If someone reached base, a earned run gets enqueued
        if (REACHED_BASE_SIGNS.has(atBat.outcomeSign)) {
            workingQueue = addToQueue(workingQueue, atBat.pitcher.id);
        }

        // For every RBI scored, we give corresponding pitchers runs allowed
        for (let i = 0; i < atBat.rbis; i++) {
            const { pitcherId, queue } = dequeueRun(workingQueue);
            if (pitcherId === null) break;
            pitcherIdHasEarnedRun.push(pitcherId);
            workingQueue = queue;
        }

        // For every OUT, depending on the play, we remove base runners
        for (let i = 0; i < atBat.recordedOuts; i++) {
            // We SOs, simply ignore the 1 out
            if (STRIKEOUT_SIGNS.has(atBat.outcomeSign)) {
                continue

            // For OUT plays, we ignore the first out but dequeue past it
            } else if (OUT_IN_PLAY_SIGNS.has(atBat.outcomeSign) && i > 0) {
                workingQueue = dequeueRun(workingQueue).queue;

            // For all other plays, (so the REACHED_BASE_SIGNS), we remove all base runners for all outs
            } else if (REACHED_BASE_SIGNS.has(atBat.outcomeSign)) {
                workingQueue = dequeueRun(workingQueue).queue;
            }
        }

        // Compute the next game state
        let nextState: GameData = { ...gameData };

        // 1. Update outs
        nextState.numberOfOuts = newOuts;

        // 2. Update runs and advance batter
        if (awayBatting) {
            nextState.currAwayTeamBatter = (nextState.currAwayTeamBatter + 1) % nextState.awayTeamLineup.length;
            nextState.awayRuns = newAwayRuns;
        } else {
            nextState.currHomeTeamBatter = (nextState.currHomeTeamBatter + 1) % nextState.homeTeamLineup.length;
            nextState.homeRuns = newHomeRuns;
        }

        // 4. Changes number on base and earnedRunsQueue
        //  These values also can potentially be overwritten in `3.`
        nextState.numberOnBase = workingQueue.length;
        nextState.earnedRunsQueue = workingQueue;

        // 3. Handle switching innings
        if (switchSides && !gameJustEnded) {
            nextState.numberOnBase = 0;
            nextState.earnedRunsQueue = [];

            if (!awayBatting) {
                nextState.inning += 1;
            }
            nextState.awayTeamBatting = !awayBatting;
        }

        if (gameJustEnded) {
            nextState.isGameOver = true;
        }

        setGameState(nextState);

        // Potentially changes our UI view if we switched sides
        if (switchSides && !gameJustEnded) {
            setLogType('pitching_change');
        }

        // Handles database queries
        try {
            const logId = await insertLogToDB(atBat);
            if (switchSides) await insertLogToDB({ type: 'inning_switch' });

            // Patch the log entry in state with the real DB logId
            setLog(prev => prev.map(e => (e === atBat ? { ...e, logId } : e)));

            await updateGameStateInDB(nextState, gameJustEnded);

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

    const goToNextView = (nextGameData: GameData) => {
        const fieldingPitcher = nextGameData.awayTeamBatting ? nextGameData.homePitcher : nextGameData.awayPitcher;
        setLogType(fieldingPitcher ? 'atbat' : 'pitching_change');
    };

    const handleLogPitchingChange = async (pitchingChange: PitchingChangeLog) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setIsSubmitting(true);

        setLog(prev => [...prev, pitchingChange]);

        const nextGameData: GameData = {
            ...gameData,
            awayPitcher: pitchingChange.teamChangingPitchers === 'away' ? pitchingChange.newPitcher : gameData.awayPitcher,
            homePitcher: pitchingChange.teamChangingPitchers === 'home' ? pitchingChange.newPitcher : gameData.homePitcher,
        };

        setGameState(nextGameData);

        goToNextView(nextGameData);

        try {
            await insertLogToDB(pitchingChange);
            await updateGameStateInDB(nextGameData);
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

        goToNextView(gameData);

        try {
            await insertLogToDB(additionalInformation);
        } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
    };

    const handleStartEditAtBat = (index: number, entry: AtBatLog) => {
        setEditingLog({ index, entry });
    };

    const handleSaveAtBatEdit = async (formerAtBat: AtBatLog, newAtBat: AtBatLog) => {
        if (!editingLog) return;
        const { index, entry: oldAtBat } = editingLog;

        const changedBatOutcome = (
            formerAtBat.outcomeSign === newAtBat.outcomeSign &&
            formerAtBat.rbis === newAtBat.rbis &&
            formerAtBat.recordedOuts === newAtBat.recordedOuts
        )

        const editNote = !(changedBatOutcome)
            ? `(Edited from: ${atBatLogSummary(formerAtBat)})`
            : "";
        
        const appendedComments = (newAtBat.extraComments)
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

        goToNextView(editGamestateLog.newGameData);

        try {
            await insertLogToDB(editGamestateLog);
            await updateGameStateInDB(editGamestateLog.newGameData);
        } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
    };


    return (
        <div>
            <button onClick={() => setGameState(null)}>← Back</button>

            {editingLog === null && (
                <div style={{ paddingBottom: "1em" }}>
                    <h3>Types of logs: </h3>
                    <div className="radio-group radio-group--fill">
                        <label>
                            <input
                                type="radio"
                                name="logType"
                                value="atbat"
                                checked={logType === 'atbat'}
                                disabled={!(gameData.awayTeamBatting ? gameData.homePitcher : gameData.awayPitcher)}
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
                    <hr></hr>
                </div>
            )}

            <Jumbotron
                gameData={gameData} gameLogging={true}
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
