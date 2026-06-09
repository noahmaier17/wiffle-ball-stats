import { useEffect, useState } from 'react';
import { type Park, type PlayerGameData } from '../types';
import { usePlayers } from '../contexts/PlayersContext';
import { useStatsData, type StatsAtBatLogRow } from '../contexts/StatsDataContext';
import { computeAllPlayerStatistics } from '../utils/computeAllPlayerStatistics';
import { computeBattersVersusPitcher } from '../utils/computeBattersVersusPitcher';
import { computePitchersVersusBatter } from '../utils/computePitchersVersusBatter';

type UseComputedStatsOptions = {
    selectedParks: Set<Park>;
    selectedFielderCounts: Set<number>;
    selectedGameIds: Set<number> | null;
    selectedPitcherId: number | null;
    selectedBatterId: number | null;
};

type UseComputedStatsResult = {
    allStats: PlayerGameData[] | null;
    selectedBatterStats: PlayerGameData[] | null;
    selectedPitcherStats: PlayerGameData[] | null;
    batterIdsWithoutStats: Set<number> | null;
    pitcherIdsWithoutStats: Set<number> | null;
    atBatLogsByGame: Map<number, StatsAtBatLogRow[]> | null;
};

export function useComputedStats({
    selectedParks,
    selectedFielderCounts,
    selectedGameIds,
    selectedPitcherId,
    selectedBatterId,
}: UseComputedStatsOptions): UseComputedStatsResult {
    const players = usePlayers();
    const { playerGameStats, atBatLogs, games, gameLogs, isLoading } = useStatsData();

    // Aggregated stats across all games (or filtered games)
    const [allStats, setAllStats] = useState<PlayerGameData[] | null>(null);
    // Stats with the versus-pitcher / versus-batter filter applied
    const [selectedBatterStats, setSelectedBatterStats] = useState<PlayerGameData[] | null>(null);
    const [selectedPitcherStats, setSelectedPitcherStats] = useState<PlayerGameData[] | null>(null);
    // Players whose stats are all zeros in the current filter (hidden from table)
    const [batterIdsWithoutStats, setBatterIdsWithoutStats] = useState<Set<number> | null>(null);
    const [pitcherIdsWithoutStats, setPitcherIdsWithoutStats] = useState<Set<number> | null>(null);
    const [atBatLogsByGame, setAtBatLogsByGame] = useState<Map<number, StatsAtBatLogRow[]> | null>(null);

    // Recompute all displayed stats whenever the cached data or any filter changes.
    useEffect(() => {
        // Don't compute until the initial data load has finished
        if (isLoading) return;

        // We must apply all filters (park, fielders, specific games) and get our gameIds
        const gameIds = games
            .filter(g => selectedParks.has(g.field as Park))
            .filter(g => selectedFielderCounts.has(g.number_of_fielders))
            .filter(g => selectedGameIds === null || selectedGameIds.has(g.id))
            .map(g => g.id);

        // Maps game IDs to log IDs so we can filter at_bat_logs by our set of filters.
        const gameIdSet = new Set(gameIds);
        const filteredGameLogs = gameLogs.filter(gl => gameIdSet.has(gl.game_id));
        const logIds = filteredGameLogs.map(gl => gl.id);

        // Group filtered at-bat logs by game_id
        const logIdToGameId = new Map<number, number>(filteredGameLogs.map(gl => [gl.id, gl.game_id]));
        const logIdSet = new Set(logIds);
        const byGame = new Map<number, StatsAtBatLogRow[]>();
        for (const log of atBatLogs) {
            if (!logIdSet.has(log.log_id)) continue;
            const gameId = logIdToGameId.get(log.log_id);
            if (gameId === undefined) continue;
            const bucket = byGame.get(gameId);
            if (bucket) bucket.push(log);
            else byGame.set(gameId, [log]);
        }
        setAtBatLogsByGame(byGame);

        // Aggregate per-game player_game_stats into career totals
        const allData = computeAllPlayerStatistics(playerGameStats, { batterIds: players, gameIds });
        setAllStats(Array.from(allData[0].values()));

        // Batting table: either all batters' totals, or batters' stats vs a specific pitcher
        if (selectedPitcherId === null) {
            setSelectedBatterStats(Array.from(allData[0].values()));
            setBatterIdsWithoutStats(allData[1]);
        } else {
            const result = computeBattersVersusPitcher(atBatLogs, {
                batters: players,
                pitchers: players.filter(p => p.id === selectedPitcherId),
                logIds,
            });
            setSelectedBatterStats(Array.from(result[0].values()));
            setBatterIdsWithoutStats(result[1]);
        }

        // Pitching table: either all pitchers' totals, or pitchers' stats vs a specific batter
        if (selectedBatterId === null) {
            setSelectedPitcherStats(Array.from(allData[0].values()));
            setPitcherIdsWithoutStats(allData[1]);
        } else {
            const result = computePitchersVersusBatter(atBatLogs, {
                batters: players.filter(p => p.id === selectedBatterId),
                pitchers: players,
                logIds,
            });
            setSelectedPitcherStats(Array.from(result[0].values()));
            setPitcherIdsWithoutStats(result[1]);
        }
    }, [playerGameStats, atBatLogs, games, gameLogs, selectedPitcherId, selectedBatterId, selectedParks, selectedFielderCounts, selectedGameIds, players, isLoading]);

    return { allStats, selectedBatterStats, batterIdsWithoutStats, selectedPitcherStats, pitcherIdsWithoutStats, atBatLogsByGame };
}
