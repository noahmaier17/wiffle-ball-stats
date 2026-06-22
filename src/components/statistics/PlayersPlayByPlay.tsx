import { useState } from "react";
import { usePlayers } from "../../contexts/PlayersContext"
import type { AtBatOutcomeSign, Player } from "../../types"
import { type PlayerAtBat } from "../../utils/fetchGame";
import LogRow from "../gameplayLogging/LogRow";
import { useStatsData, type StatsAtBatLogRow, type StatsGameRow } from "../../contexts/StatsDataContext";

type PlayersPlayByPlayProps = {
    player: Player,
    forBatting: boolean,
    atBatLogsByGame: Map<number, StatsAtBatLogRow[]>

}

function PlayersPlayByPlay({ 
    player, forBatting, atBatLogsByGame
}: PlayersPlayByPlayProps) {
    // Fetches list of players
    const players = usePlayers();

    // Gets our list of games
    const { games } = useStatsData()

    const [showOpponent, setShowOpponent] = useState(false);

    // We need to filter all games where this player was not playing, and store game information as well
    const filteredGameIdToLogs = [...atBatLogsByGame.entries()].sort((a, b) => a[0] - b[0]).reduce((accumulator, [gameId, log]) => {
        // We fetch on batter_id or pitcher_id depending on forBatting
        const filteredLogs = ((forBatting)
            ? log.filter(l => l.batter_id === player.id)
            : log.filter(l => l.pitcher_id === player.id))
            .reverse()
        
        // IFF we do not have logs, we add nothing to the accumulator
        if (filteredLogs.length === 0) return accumulator;

        // Gets our game. If for some weird DB reason we don't find it, returns early
        const game = games.find(g => g.id === gameId);
        if (!game) return accumulator;

        if (filteredLogs.length > 0) accumulator.set(game, filteredLogs);
        return accumulator;
    },
    new Map<StatsGameRow, StatsAtBatLogRow[]>()
);

    return (
        <div>
            <h3>
                {(forBatting) ? "Batter" : "Pitcher"} Play by Play
                {forBatting && (
                    <button onClick={() => setShowOpponent(v => !v)} style={{ marginLeft: '0.75rem' }}>
                        Toggle Showing Pitcher
                    </button>
                )}
            </h3>
            {[...filteredGameIdToLogs.entries()].map(([game, logs]) => {
                return (
                    <div key={game.id}>
                        <b>{game.date}</b>
                        <ul>
                            {logs.map(l => {
                                const atBat: PlayerAtBat = {
                                    type: 'atbat',
                                    logId: l.log_id,
                                    batter: players.find(p => p.id === l.batter_id)!,
                                    pitcher: players.find(p => p.id === l.pitcher_id)!,
                                    rbis: l.rbis,
                                    recordedOuts: l.recorded_outs,
                                    outcomeSign: l.outcome_sign as AtBatOutcomeSign,
                                    extraComments: l.extra_comments,
                                    gameId: game.id
                                }

                                return <li key={l.log_id}><LogRow atBat={atBat} showOpponent={showOpponent} /></li>
                            })}
                        </ul>
                    </div>
                );
            })}
        </div>
    );
}

export default PlayersPlayByPlay