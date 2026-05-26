import { useEffect, useState } from "react"
import { usePlayers } from "../../contexts/PlayersContext"
import type { Player } from "../../types"
// import { fetchPlayerBatterLogs, fetchGamesByIds, type PlayerAtBat, type GameRow } from "../../utils/fetchGame";
import { fetchPlayerBatterLogs, fetchPlayerPitcherLogs, type PlayerAtBat } from "../../utils/fetchGame";
import LogRow from "../gameplayLogging/LogRow";

type PlayersPlayByPlayProps = {
    player: Player,
    forBatting: boolean
}

function PlayersPlayByPlay({ player, forBatting }: PlayersPlayByPlayProps) {
    const players = usePlayers();
    const [logs, setLogs] = useState<PlayerAtBat[]>([]);

    // const [games, setGames] = useState<GameRow[]>([]);

    useEffect(() => {
        const load = async () => {
            const data = (forBatting) 
                ? await fetchPlayerBatterLogs(player.id, players, { dropFlaggedBatterLogs: true }) 
                : await fetchPlayerPitcherLogs(player.id, players, { dropFlaggedPitcherLogs: true });
            const reversed = [...data].reverse();
            // const gameIds = [...new Set(reversed.map(l => l.gameId))];
            // const [fetchedGames] = await Promise.all([fetchGamesByIds(gameIds)]);
            setLogs(reversed);
            // setGames(fetchedGames);
        };
        load();
    }, [player.id]);

    const gameIds = [...new Set(logs.map(l => l.gameId))];

    return (
        <div>
            {gameIds.map(gameId => {
                // const game = games.find(g => g.id === gameId);
                const gameLogs = logs.filter(l => l.gameId === gameId);
                return (
                    <div key={gameId}>
                        <ul>
                            {gameLogs.map(l => (
                                <li key={l.logId}><LogRow atBat={l} /></li>
                            ))}
                        </ul>
                    </div>
                );
            })}
        </div>
    );
}

export default PlayersPlayByPlay