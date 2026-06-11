import { useState } from 'react';
import { ComposedChart, Line, XAxis, YAxis, Legend, ResponsiveContainer, Customized } from 'recharts';
import { useStatsData } from '../../contexts/StatsDataContext';
import { usePlayers } from '../../contexts/PlayersContext';
import { playerName, type Park, type statViewTypes } from '../../types';
import type { StatsAtBatLogRow } from '../../contexts/StatsDataContext';
import { HIT_SIGNS, PARKS, REACHED_BASE_SIGNS, STRIKEOUT_SIGNS } from '../../constants';
import FilterPanel from './FilterPanel';
import HandleStatisticsViewToggle from './HandleStatisticsViewToggle';
import ParkAndFielderFilters from './ParkAndFielderFilters';
import GameFilter from './GameFilter';

// List of options for the X axis
const X_STAT_OPTIONS = [
    { key: 'at_bats',          label: 'At Bats' },
    { key: 'plate_appearances', label: 'Plate Appearances' },
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
    { key: 'ops',         label: 'OPS' }
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

const LINE_COLORS = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300',
    '#0088fe', '#00C49F', '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57',
];
// Distinct dash patterns so overlapping lines stay distinguishable where they cross
const LINE_DASHES = ['0', '6 3', '2 2', '8 4 2 4', '10 4', '4 2 1 2'];
const JITTER_STEP = 0; // 0.06; // vertical gap between overlapping lines

function PlayerStatsChart({ onBack }: { onBack: () => void }) {
    // Gets all our important statistics information
    const { atBatLogs, games, gameLogs, isLoading } = useStatsData();

    const [viewType, setViewType] = useState<statViewTypes>('default');
    const [selectedParks, setSelectedParks] = useState<Set<Park>>(new Set(PARKS));
    const [selectedFielderCounts, setSelectedFielderCounts] = useState<Set<number>>(new Set([3]));
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
    const logIdSet = new Set(gameLogs.filter(gl => gameIdSet.has(gl.game_id)).map(gl => gl.id));
    const filteredAtBatLogs = atBatLogs.filter(log => logIdSet.has(log.log_id));

    // Pass 1: build raw points, skipping players with no stats
    const rawDataMap = players.reduce<Map<number, ChartPoint[]>>(
        (map, p) => {
            const [points, noStats] = buildPlayerChartData(filteredAtBatLogs, p.id, selectedXStat, selectedYStat);
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
                    {X_STAT_OPTIONS.map(o => (
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
                    {Y_STAT_OPTIONS_BATTER.map(o => (
                        <label key={o.key}>
                            <input
                                type="radio"
                                name="y-stat"
                                value={o.key}
                                checked={selectedYStat === o.key}
                                onChange={() => setSelectedYStat(o.key)}
                            />
                            {o.label}
                        </label>
                    ))}
                </div>
                <div>
                    Pitching:
                    {Y_STAT_OPTIONS_PITCHER.map(o => (
                        <label key={o.key}>
                            <input
                                type="radio"
                                name="y-stat"
                                value={o.key}
                                checked={selectedYStat === o.key}
                                onChange={() => setSelectedYStat(o.key)}
                            />
                            {o.label}
                        </label>
                    ))}
                </div>
            </div>

            {/*
                ComposedChart is used instead of LineChart because it allows each <Line>
                to have its own `data` array. This is necessary since each player has a
                different total number of at-bats (different x-axis length).
            */}
            <ResponsiveContainer width="100%" height={450}>
            <ComposedChart margin={{ top: 30, right: 30, bottom: 30, left: 30 }}>
                <Customized component={({ width }: any) => (
                    <text x={width / 2} y={16} textAnchor="middle" fill="#555" fontSize={14}>
                        {yLabel} vs {xLabel}
                    </text>
                )} />
                <XAxis
                    dataKey="x"
                    type="number"
                    label={{ value: xLabel, position: 'insideBottom', offset: -15 }}
                />
                <YAxis
                    dataKey="yJitter"
                    label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 10 }}
                    allowDecimals={DECIMAL_Y_STATS.has(selectedYStat)}
                    domain={[-(visibleCount - 1) / 2 * JITTER_STEP, UNIT_Y_STATS.has(selectedYStat) ? 1 : 'auto']}
                    tickFormatter={(v) => String(DECIMAL_Y_STATS.has(selectedYStat) ? Math.round(v * 1000) / 1000 : Math.round(v))}
                />
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