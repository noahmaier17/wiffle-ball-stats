import { useState } from 'react';
import { ComposedChart, Line, XAxis, YAxis, Legend, ResponsiveContainer, Customized, ReferenceLine } from 'recharts';
import { useStatsData } from '../../contexts/StatsDataContext';
import { usePlayers } from '../../contexts/PlayersContext';
import { playerName, type Park, type statViewTypes, type PlayerGameData } from '../../types';
import type { StatsAtBatLogRow, StatsGameRow } from '../../contexts/StatsDataContext';
import { initStreakState, stepStreak, type StreakState } from '../../utils/calculateStreaks';
import { HIT_SIGNS, OFFICIAL_FIELDER_COUNTS, OFFICIAL_PARKS, REACHED_BASE_SIGNS, STRIKEOUT_SIGNS } from '../../constants';
import FilterPanel from './FilterPanel';
import HandleStatisticsViewToggle from './HandleStatisticsViewToggle';
import ParkAndFielderFilters from './ParkAndFielderFilters';
import GameFilter from './GameFilter';

// List of options for the X axis
const X_STAT_OPTIONS = [
    { key: 'at_bats',          label: 'At Bats',          group: 'career' },
    { key: 'plate_appearances', label: 'Plate Appearances', group: 'career' },
    { key: 'game',             label: 'Games',             group: 'career' },
    { key: 'league_game',      label: 'Games',             group: 'league' },
] as const;

// List of options for the Y axis for batters
const Y_STAT_OPTIONS_BATTER = [
    { key: 'hr',          label: 'HR' },
    { key: 'iphr',        label: 'IPHR' },
    { key: 'hits',        label: 'H' },
    { key: 'singles',     label: '1B' },
    { key: 'doubles',     label: '2B' },
    { key: 'triples',     label: '3B' },
    { key: 'strikeouts',  label: 'SO' },
    { key: 'outs',        label: 'OUT' },
    { key: 'walks',       label: 'BB' },
    { key: 'rbis',        label: 'RBI' },
    { key: 'fc',          label: 'FC' },
    { key: 'tb',          label: 'TB' },
    { key: 'ba',          label: 'BA' },
    { key: 'obp',         label: 'OBP' },
    { key: 'slg',         label: 'SLG' },
    { key: 'ops',         label: 'OPS' },
    { key: 'wins',           label: 'W' },
    { key: 'losses',         label: 'L' },
    { key: 'current_streak', label: 'STK' },
    { key: 'win_streak',     label: 'wSTK' },
    { key: 'loss_streak',    label: 'lSTK' }
] as const;
// List of options for the Y axis for pitchers
const Y_STAT_OPTIONS_PITCHER = [
    { key: 'outs_pitched',      label: 'OUT' },
    { key: 'bf',                label: 'BF' },
    { key: 'hits_pitched',      label: 'H' },
    { key: 'walks_pitched',     label: 'BB' },
    { key: 'strikeouts_pitched',label: 'SO' },
    { key: 'era',               label: 'ERA' },
    { key: 'whip',              label: 'WHIP' }
] as const;
// List of all options combined
const Y_STAT_OPTIONS = [...Y_STAT_OPTIONS_BATTER, ...Y_STAT_OPTIONS_PITCHER] as const;

// Corresponding types of the axes
type XStatKey = typeof X_STAT_OPTIONS[number]['key'];
type YStatBatter = typeof Y_STAT_OPTIONS_BATTER[number]['key'];
type YStatPitcher = typeof Y_STAT_OPTIONS_PITCHER[number]['key'];
type YStatKey = YStatBatter | YStatPitcher;

const BATTER_Y_STAT_KEYS = new Set(Y_STAT_OPTIONS_BATTER.map(o => o.key));
function isBatterStat(yStat: YStatKey): yStat is YStatBatter {
    return BATTER_Y_STAT_KEYS.has(yStat as YStatBatter);
}

// Stats that use decimal ticks (not rounded to integers on the y-axis)
const DECIMAL_Y_STATS = new Set<YStatKey>(['ba', 'obp', 'slg', 'ops']);
// Subset of DECIMAL_Y_STATS whose y-axis domain is capped at 1.0
const UNIT_Y_STATS = new Set<YStatKey>(['ba', 'obp']);
// Stats that require per-game data and are only valid on game-based X axes
const GAME_ONLY_Y_STATS = new Set<YStatKey>([
    'era', 'whip',
    'wins', 'losses', 'current_streak', 'win_streak', 'loss_streak',
]);
// Stats that can go negative and therefore need an auto (not zero-floored) y-axis
const SIGNED_Y_STATS = new Set<YStatKey>(['current_streak']);

// One data point per plate appearance or at-bat depending on xStat.
// x = cumulative x-axis count, y = cumulative y-axis stat value.
type ChartPoint = { x: number; y: number };

// Builds the array of chart points for a single player.
// Returns our list of points and if the player actually recorded any stats.
function buildPlayerChartData(
    atBatLogs: StatsAtBatLogRow[],
    playerId: number,
    xStat: XStatKey,
    yStat: YStatKey,
): [ChartPoint[], boolean] {
    const playerLogs = (isBatterStat(yStat))
        ? atBatLogs
            .filter(r => r.batter_id === playerId && !r.flagged_batter_row)
            .sort((a, b) => a.log_id - b.log_id)
        : atBatLogs
            .filter(r => r.pitcher_id === playerId && !r.flagged_batter_row)
            .sort((a, b) => a.log_id - b.log_id)

    // Short function to calculate total bases
    const calculateTB = (log: StatsAtBatLogRow) => {
        switch (log.outcome_sign) {
            case '1B': return 1;
            case '2B': return 2;
            case '3B': return 3;
            case 'HR': return 4;
            case 'IPHR': return 4;
            default: return 0;
        }
    }

    const points: ChartPoint[] = [];
    let cumulativeX = 0;
    let cumulativeY = 0;  // Some stats accumulate Y values, some simply set it
    let skipStat = false; // For when we want to skip a stat for whatever reason
    // Other cumulative values for calculating more complex stats
    let cumulative1 = 0;
    let cumulative2 = 0;

    for (const log of playerLogs) {
        skipStat = false;

        // With at_bats, we increase X on anything except a walk
        if (xStat === 'at_bats') {
            if (log.outcome_sign !== 'BB') cumulativeX++;

        // With plate_appearances, we simply increase X on every log
        } else if (xStat === 'plate_appearances') {
            cumulativeX++;
        }

        // With home runs, if our outcome is a HR or IPHR, we increase Y
        if (yStat === 'hr' && (log.outcome_sign === 'HR' || log.outcome_sign === 'IPHR')) cumulativeY++;
        if (yStat === 'iphr' && (log.outcome_sign === 'IPHR')) cumulativeY++;
        if (yStat === 'hits' && (REACHED_BASE_SIGNS.has(log.outcome_sign))) cumulativeY++;
        if (yStat === 'singles' && (log.outcome_sign === '1B')) cumulativeY++;
        if (yStat === 'doubles' && (log.outcome_sign === '2B')) cumulativeY++;
        if (yStat === 'triples' && (log.outcome_sign === '3B')) cumulativeY++;
        if (yStat === 'strikeouts' && (STRIKEOUT_SIGNS.has(log.outcome_sign))) cumulativeY++;
        if (yStat === 'outs' && (log.outcome_sign === 'Out')) cumulativeY++;
        if (yStat === 'walks' && (log.outcome_sign === 'BB')) cumulativeY++;
        if (yStat === 'rbis') cumulativeY += log.rbis;
        if (yStat === 'fc' && (log.outcome_sign === 'FC')) cumulativeY++;
        if (yStat === 'tb') cumulativeY += calculateTB(log);
        if (yStat === 'ba') {
            // Calculates cumulative hits
            if (HIT_SIGNS.has(log.outcome_sign)) cumulative1++;
            // Calculates cumulative at bats
            if (log.outcome_sign !== 'BB') cumulative2++;
            skipStat = (cumulative2 === 0)
            cumulativeY = cumulative1 / cumulative2;
        }
        if (yStat === 'obp') {
            // Calculates cumulative getting on base
            if (HIT_SIGNS.has(log.outcome_sign) || log.outcome_sign === 'BB') cumulative1++;
            // Calculates cumulative plate appearances
            cumulative2++;
            cumulativeY = cumulative1 / cumulative2;
        }
        if (yStat === 'slg') {
            // Calculates total bases
            cumulative1 += calculateTB(log);
            // Calculates cumulative at bats
            if (log.outcome_sign !== 'BB') cumulative2++;
            skipStat = (cumulative2 === 0)
            cumulativeY = cumulative1 / cumulative2;
        }
        if (yStat === 'ops') {
            // First, OBP
            // Calculates cumulative getting on base
            if (HIT_SIGNS.has(log.outcome_sign) || log.outcome_sign === 'BB') cumulative1++;
            // Calculates cumulative plate appearances
            cumulative2++;
            cumulativeY = cumulative1 / cumulative2;
            // Second, SLG
            // Calculates total bases
            cumulative1 += calculateTB(log);
            // Calculates cumulative at bats
            if (log.outcome_sign !== 'BB') cumulative2++;
            cumulativeY = cumulative1 / cumulative2;
        }

        if (yStat === 'outs_pitched' && (log.outcome_sign === 'Out')) cumulativeY++;
        if (yStat === 'bf') cumulativeY++;
        if (yStat === 'hits_pitched' && (REACHED_BASE_SIGNS.has(log.outcome_sign))) cumulativeY++;
        if (yStat === 'walks_pitched' && (log.outcome_sign === 'BB')) cumulativeY++;
        if (yStat === 'strikeouts_pitched' && (STRIKEOUT_SIGNS.has(log.outcome_sign))) cumulativeY++;

        // Adds this point for this player
        if (!skipStat) points.push({ x: cumulativeX, y: cumulativeY });
    }

    // If cumulativeX or cumulativeY is 0, this player recorded no stats
    return [points, (cumulativeX === 0 || cumulativeY === 0)];
}

type GameStatAccumulators = {
    cumulativeY: number; skipStat: boolean;
    cumHits: number; cumAB: number; cumPA: number; cumTB: number;
    cumPitchedOuts: number; cumRunsAllowed: number;
    cumPitchedWalks: number; cumHitsAllowed: number;
    streak: StreakState;
};

function defaultGameStatAccumulators(): GameStatAccumulators {
    return {
        cumulativeY: 0, skipStat: false,
        cumHits: 0, cumAB: 0, cumPA: 0, cumTB: 0,
        cumPitchedOuts: 0, cumRunsAllowed: 0, cumPitchedWalks: 0, cumHitsAllowed: 0,
        streak: initStreakState(),
    };
}

function applyGameRowToAccumulators(
    row: PlayerGameData,
    yStat: YStatKey,
    acc: GameStatAccumulators,
): void {
    acc.skipStat = false;
    const rowTB = row.singles + 2 * row.doubles + 3 * row.triples
                + 4 * row.home_runs + 4 * row.inside_the_park_home_runs;

    if (yStat === 'hr') acc.cumulativeY += row.home_runs + row.inside_the_park_home_runs;
    if (yStat === 'iphr') acc.cumulativeY += row.inside_the_park_home_runs;
    if (yStat === 'hits') acc.cumulativeY += row.hits;
    if (yStat === 'singles') acc.cumulativeY += row.singles;
    if (yStat === 'doubles') acc.cumulativeY += row.doubles;
    if (yStat === 'triples') acc.cumulativeY += row.triples;
    if (yStat === 'strikeouts') acc.cumulativeY += row.strikeouts;
    if (yStat === 'outs') acc.cumulativeY += row.at_bats - row.hits - row.strikeouts - row.fielders_choice;
    if (yStat === 'walks') acc.cumulativeY += row.walks;
    if (yStat === 'rbis') acc.cumulativeY += row.runs_batted_in;
    if (yStat === 'fc') acc.cumulativeY += row.fielders_choice;
    if (yStat === 'tb') acc.cumulativeY += rowTB;
    if (yStat === 'ba') {
        acc.cumHits += row.hits; acc.cumAB += row.at_bats;
        acc.skipStat = acc.cumAB === 0;
        acc.cumulativeY = acc.cumHits / acc.cumAB;
    }
    if (yStat === 'obp') {
        acc.cumHits += row.hits + row.walks; acc.cumPA += row.plate_appearances;
        acc.skipStat = acc.cumPA === 0;
        acc.cumulativeY = acc.cumHits / acc.cumPA;
    }
    if (yStat === 'slg') {
        acc.cumTB += rowTB; acc.cumAB += row.at_bats;
        acc.skipStat = acc.cumAB === 0;
        acc.cumulativeY = acc.cumTB / acc.cumAB;
    }
    if (yStat === 'ops') {
        acc.cumHits += row.hits + row.walks; acc.cumPA += row.plate_appearances;
        acc.cumTB += rowTB; acc.cumAB += row.at_bats;
        acc.skipStat = acc.cumPA === 0 && acc.cumAB === 0;
        const obp = acc.cumPA > 0 ? acc.cumHits / acc.cumPA : 0;
        const slg = acc.cumAB > 0 ? acc.cumTB  / acc.cumAB : 0;
        acc.cumulativeY = obp + slg;
    }
    if (yStat === 'wins') acc.cumulativeY += row.win;
    if (yStat === 'losses') acc.cumulativeY += row.loss;
    if (yStat === 'current_streak' || yStat === 'win_streak' || yStat === 'loss_streak') {
        // games with no decision (left early) plot no point; stepAfter holds the prior value
        const counted = stepStreak(acc.streak, row.win, row.loss);
        acc.skipStat = !counted;
        if (counted) acc.cumulativeY =
            yStat === 'current_streak' ? acc.streak.current
          : yStat === 'win_streak'     ? acc.streak.longestWin
          :                              acc.streak.longestLoss;
    }
    if (yStat === 'outs_pitched') acc.cumulativeY += row.pitched_outs;
    if (yStat === 'bf') acc.cumulativeY += row.batters_faced;
    if (yStat === 'hits_pitched') acc.cumulativeY += row.hits_allowed;
    if (yStat === 'walks_pitched') acc.cumulativeY += row.pitched_walks;
    if (yStat === 'strikeouts_pitched') acc.cumulativeY += row.pitched_strikeouts;
    if (yStat === 'era') {
        acc.cumPitchedOuts += row.pitched_outs; acc.cumRunsAllowed += row.runs_allowed;
        acc.skipStat = acc.cumPitchedOuts === 0;
        acc.cumulativeY = (acc.cumRunsAllowed * 27) / acc.cumPitchedOuts;
    }
    if (yStat === 'whip') {
        acc.cumPitchedOuts += row.pitched_outs;
        acc.cumPitchedWalks += row.pitched_walks;
        acc.cumHitsAllowed += row.hits_allowed;
        acc.skipStat = acc.cumPitchedOuts === 0;
        acc.cumulativeY = (acc.cumPitchedWalks + acc.cumHitsAllowed) * 3 / acc.cumPitchedOuts;
    }
}

function buildPlayerChartDataByGame(
    playerGameStats: PlayerGameData[],
    gameIdSet: Set<number>,
    playerId: number,
    yStat: YStatKey,
): [ChartPoint[], boolean] {
    const playerRows = playerGameStats
        .filter(r => r.player_id === playerId && gameIdSet.has(r.game_id))
        .filter(r => isBatterStat(yStat) || r.games_pitched > 0)
        .sort((a, b) => a.game_id - b.game_id);

    if (playerRows.length === 0) return [[], true];

    const points: ChartPoint[] = [];
    let gameNumber = 0;
    const acc = defaultGameStatAccumulators();

    for (const row of playerRows) {
        gameNumber++;
        applyGameRowToAccumulators(row, yStat, acc);
        if (!acc.skipStat) points.push({ x: gameNumber, y: acc.cumulativeY });
    }

    if (points.length > 0) {
        points.push({ x: gameNumber + 1, y: points[points.length - 1].y });
    }

    return [points, points.length === 0 || acc.cumulativeY === 0];
}

function buildPlayerChartDataByLeagueGame(
    playerGameStats: PlayerGameData[],
    filteredGamesSorted: StatsGameRow[],
    playerId: number,
    yStat: YStatKey,
): [ChartPoint[], boolean] {
    const playerStatsByGameId = new Map(
        playerGameStats
            .filter(r => r.player_id === playerId)
            .filter(r => isBatterStat(yStat) || r.games_pitched > 0)
            .map(r => [r.game_id, r])
    );

    if (filteredGamesSorted.length === 0) return [[], true];

    const points: ChartPoint[] = [];
    let leagueGameNumber = 0;
    let lastLeagueGameNumber = 0;
    const acc = defaultGameStatAccumulators();

    for (const game of filteredGamesSorted) {
        leagueGameNumber++;
        const row = playerStatsByGameId.get(game.id);
        if (!row) continue;
        lastLeagueGameNumber = leagueGameNumber;
        applyGameRowToAccumulators(row, yStat, acc);
        if (!acc.skipStat) points.push({ x: leagueGameNumber, y: acc.cumulativeY });
    }

    if (points.length > 0) {
        points.push({ x: lastLeagueGameNumber + 1, y: points[points.length - 1].y });
    }

    return [points, points.length === 0 || acc.cumulativeY === 0];
}

const LINE_COLORS = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300',
    '#0088fe', '#00C49F', '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57',
];
// Distinct dash patterns so overlapping lines stay distinguishable where they cross
const LINE_DASHES = ['0', '6 3', '2 2', '8 4 2 4', '10 4', '4 2 1 2'];
const JITTER_STEP = 0; // 0.06; // vertical gap between overlapping lines

const formatDateShort = (dateStr: string) => {
    const [, month, day] = dateStr.split('-');
    return `${parseInt(month)}/${parseInt(day)}`;
};


function PlayerStatsChart({ onBack }: { onBack: () => void }) {
    // Gets all our important statistics information
    const { atBatLogs, games, gameLogs, isLoading, playerGameStats } = useStatsData();

    const [viewType, setViewType] = useState<statViewTypes>('default');
    const [selectedParks, setSelectedParks] = useState<Set<Park>>(new Set<Park>(OFFICIAL_PARKS));
    const [selectedFielderCounts, setSelectedFielderCounts] = useState<Set<number>>(new Set<number>(OFFICIAL_FIELDER_COUNTS));
    const [selectedGameIds, setSelectedGameIds] = useState<Set<number> | null>(null);

    // Gets all the players
    const players = usePlayers();

    // Our selected X and Y parameters
    const [selectedXStat, setSelectedXStat] = useState<XStatKey>('at_bats');
    const [selectedYStat, setSelectedYStat] = useState<YStatKey>('hr');

    // // Tracks which player names are hidden; clicking a legend item toggles them
    // const [hiddenPlayers, setHiddenPlayers] = useState<Set<string>>(new Set());

    // Which player's line is emphasized on hover; null = no focus, all lines normal
    const [focusedPlayer, setFocusedPlayer] = useState<string | null>(null);

    // // Allows us to toggle select a player
    // const handleLegendClick = (value: string) => {
    //     setHiddenPlayers(prev => {
    //         const next = new Set(prev);
    //         next.has(value) ? next.delete(value) : next.add(value);
    //         return next;
    //     });
    // };

    // Filter atBatLogs to only logs belonging to games that match the selected parks, fielder counts, and game IDs
    const gameIdSet = new Set(
        games
            .filter(g => selectedParks.has(g.field as Park))
            .filter(g => selectedFielderCounts.has(g.number_of_fielders))
            .filter(g => selectedGameIds === null || selectedGameIds.has(g.id))
            .map(g => g.id)
    );
    const filteredGamesSorted = games.filter(g => gameIdSet.has(g.id)).sort((a, b) => a.id - b.id);
    const logIdSet = new Set(gameLogs.filter(gl => gameIdSet.has(gl.game_id)).map(gl => gl.id));
    const filteredAtBatLogs = atBatLogs.filter(log => logIdSet.has(log.log_id));

    // Pass 1: build raw points, skipping players with no stats
    const rawDataMap = players.reduce<Map<number, ChartPoint[]>>(
        (map, p) => {
            const [points, noStats] =
                selectedXStat === 'game'
                    ? buildPlayerChartDataByGame(playerGameStats, gameIdSet, p.id, selectedYStat)
                : selectedXStat === 'league_game'
                    ? buildPlayerChartDataByLeagueGame(playerGameStats, filteredGamesSorted, p.id, selectedYStat)
                : buildPlayerChartData(filteredAtBatLogs, p.id, selectedXStat, selectedYStat);
            if (noStats) return map;
            map.set(p.id, points);
            return map;
        },
        new Map()
    );

    // Pass 2: apply jitter based on the final visible player count so the band is always tight.
    // Each point also carries a jittered y (yJitter) — a small per-player vertical
    // offset so lines that share the same cumulative values don't perfectly overlap.
    const visibleCount = rawDataMap.size;
    const playerDataMap = new Map(
        [...rawDataMap.entries()].map(([id, points], i) => {
            // Center the offsets around 0 so the band straddles the true value
            const offset = (i - (visibleCount - 1) / 2) * JITTER_STEP;
            const jittered = points.map(pt => ({ ...pt, yJitter: pt.y + offset }));
            return [id, jittered];
        })
    );

    if (isLoading) {
        return (
            <div>
                <button onClick={onBack}>← Back</button>
                <p>Loading...</p>
            </div>
        );
    }

    const xLabel = X_STAT_OPTIONS.find(o => o.key === selectedXStat)!.label;
    const yLabel = Y_STAT_OPTIONS.find(o => o.key === selectedYStat)!.label;

    return (
        <div>
            <button onClick={onBack}>← Back</button>
            <h1>Graph Statistics Viewer</h1>

            <FilterPanel viewType={viewType} selectedParks={selectedParks} selectedFielderCounts={selectedFielderCounts} selectedGameIds={selectedGameIds}>
                <HandleStatisticsViewToggle
                    viewType={viewType}
                    setViewType={setViewType}
                />
                <ParkAndFielderFilters
                    selectedParks={selectedParks}
                    setSelectedParks={setSelectedParks}
                    selectedFielderCounts={selectedFielderCounts}
                    setSelectedFielderCounts={setSelectedFielderCounts}
                />
                <GameFilter
                    games={games}
                    selectedGameIds={selectedGameIds}
                    setSelectedGameIds={setSelectedGameIds}
                />
            </FilterPanel>
            
            <div>
                <p>X Axis</p>
                <div>
                    Career:
                    {X_STAT_OPTIONS.filter(o => o.group === 'career').map(o => (
                        <label key={o.key}>
                            <input
                                type="radio"
                                name="x-stat"
                                value={o.key}
                                checked={selectedXStat === o.key}
                                onChange={() => setSelectedXStat(o.key)}
                            />
                            {o.label}
                        </label>
                    ))}
                </div>
                <div>
                    League:
                    {X_STAT_OPTIONS.filter(o => o.group === 'league').map(o => (
                        <label key={o.key}>
                            <input
                                type="radio"
                                name="x-stat"
                                value={o.key}
                                checked={selectedXStat === o.key}
                                onChange={() => setSelectedXStat(o.key)}
                            />
                            {o.label}
                        </label>
                    ))}
                </div>
            </div>

            <div>
                <p>Y Axis</p>
                <div>
                    Batting:
                    {Y_STAT_OPTIONS_BATTER.map(o => {
                        const isDisabled = GAME_ONLY_Y_STATS.has(o.key) && selectedXStat !== 'game' && selectedXStat !== 'league_game';
                        return (
                            <label key={o.key} style={isDisabled ? { opacity: 0.4 } : undefined}>
                                <input
                                    type="radio"
                                    name="y-stat"
                                    value={o.key}
                                    checked={selectedYStat === o.key}
                                    onChange={() => setSelectedYStat(o.key)}
                                    disabled={isDisabled}
                                />
                                {o.label}
                            </label>
                        );
                    })}
                </div>
                <div>
                    Pitching:
                    {Y_STAT_OPTIONS_PITCHER.map(o => {
                        const isDisabled = GAME_ONLY_Y_STATS.has(o.key) && selectedXStat !== 'game' && selectedXStat !== 'league_game';
                        return (
                            <label key={o.key} style={isDisabled ? { opacity: 0.4 } : undefined}>
                                <input
                                    type="radio"
                                    name="y-stat"
                                    value={o.key}
                                    checked={selectedYStat === o.key}
                                    onChange={() => setSelectedYStat(o.key)}
                                    disabled={isDisabled}
                                />
                                {o.label}
                            </label>
                        );
                    })}
                </div>
            </div>

            {/*
                ComposedChart is used instead of LineChart because it allows each <Line>
                to have its own `data` array. This is necessary since each player has a
                different total number of at-bats (different x-axis length).
            */}
            <ResponsiveContainer width="100%" height={450}>
            <ComposedChart margin={{ top: selectedXStat === 'league_game' ? 55 : 30, right: 30, bottom: 30, left: 30 }}>
                <Customized component={({ width }: any) => (
                    <text x={width / 2} y={16} textAnchor="middle" fill="#555" fontSize={14}>
                        {yLabel} vs {xLabel}
                    </text>
                )} />
                <XAxis
                    dataKey="x"
                    type="number"
                    label={{ value: xLabel, position: 'insideBottom', offset: -15 }}
                    allowDecimals={selectedXStat === 'game' || selectedXStat === 'league_game' ? false : undefined}
                />
                <YAxis
                    dataKey="yJitter"
                    label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 10 }}
                    allowDecimals={DECIMAL_Y_STATS.has(selectedYStat)}
                    domain={[
                        SIGNED_Y_STATS.has(selectedYStat) ? 'auto' : -(visibleCount - 1) / 2 * JITTER_STEP,
                        UNIT_Y_STATS.has(selectedYStat) ? 1 : 'auto'
                    ]}
                    tickFormatter={(v) => String(DECIMAL_Y_STATS.has(selectedYStat) ? Math.round(v * 1000) / 1000 : Math.round(v))}
                />
                {SIGNED_Y_STATS.has(selectedYStat) && (
                    <ReferenceLine y={0} stroke="#999" strokeDasharray="3 3" />
                )}
                {/*
                    Legend items are interactive: clicking a name hides/shows that player's
                    line, and hovering emphasizes it while dimming the others. Both events
                    live on the span so they share one target (no double-toggle).
                */}
                <Legend
                    verticalAlign="bottom"
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value) => (
                        <span
                            onMouseEnter={() => setFocusedPlayer(value)}
                            onMouseLeave={() => setFocusedPlayer(null)}
                            style={{ cursor: 'default' }}
                        >
                            {value}
                        </span>
                    )}
                />
                {selectedXStat === 'league_game' && (
                    <Customized component={(props: any) => {
                        const scale = Object.values(props.xAxisMap as Record<string, any>)[0]?.scale;
                        if (!scale) return null;
                        const top: number = props.offset?.top ?? 55;
                        return (
                            <g>
                                {filteredGamesSorted.map((game, i) => {
                                    const px: number = scale(i + 1);
                                    const isNewDay = i === 0 || game.date !== filteredGamesSorted[i - 1].date;
                                    return (
                                        <g key={game.id}>
                                            <line
                                                x1={px} y1={top}
                                                x2={px} y2={top + (isNewDay ? 12 : 8)}
                                                stroke={isNewDay ? '#888' : '#ccc'}
                                                strokeWidth={1}
                                            />
                                            {isNewDay && (
                                                <text
                                                    x={px + 3}
                                                    y={top + 9}
                                                    fill="#888"
                                                    fontSize={9}
                                                    textAnchor="start"
                                                >
                                                    {formatDateShort(game.date)}
                                                </text>
                                            )}
                                        </g>
                                    );
                                })}
                            </g>
                        );
                    }} />
                )}
                {players.filter(p => playerDataMap.has(p.id)).map((p, i) => {
                    const name = playerName(p);
                    // Dim every line except the focused one (if any) for readability
                    const isDimmed = focusedPlayer !== null && focusedPlayer !== name;
                    return (
                        <Line
                            key={p.id}
                            data={playerDataMap.get(p.id)}  // this player's own data array
                            dataKey="yJitter"                // jittered y so overlapping lines separate
                            name={name}
                            stroke={LINE_COLORS[i % LINE_COLORS.length]}
                            strokeDasharray={LINE_DASHES[i % LINE_DASHES.length]}
                            strokeOpacity={isDimmed ? 0.12 : 1}
                            strokeWidth={focusedPlayer === name ? 3 : 1.5}  // thicken the focused line
                            type="stepAfter"    // line steps horizontally then vertically (suits integer stats)
                            connectNulls
                            dot={false}         // no circles at each data point
                            activeDot={false}   // no circle on hover either
                            // hide={hiddenPlayers.has(name)}
                        />
                    );
                })}
            </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}

export default PlayerStatsChart;