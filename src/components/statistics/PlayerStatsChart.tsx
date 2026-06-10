import { useState } from 'react';
import { ComposedChart, Line, XAxis, YAxis, Legend, ResponsiveContainer } from 'recharts';
import { useStatsData } from '../../contexts/StatsDataContext';
import { usePlayers } from '../../contexts/PlayersContext';
import { playerName } from '../../types';
import type { StatsAtBatLogRow } from '../../contexts/StatsDataContext';
import { REACHED_BASE_SIGNS, STRIKEOUT_SIGNS } from '../../constants';

// List of options for the X axis
const X_STAT_OPTIONS = [
    { key: 'at_bats',          label: 'At Bats' },
    { key: 'plate_appearances', label: 'Plate Appearances' },
] as const;

// List of options for the Y axis
const Y_STAT_OPTIONS = [
    { key: 'hr',          label: 'Home Runs' },
    { key: 'hits',        label: 'Hits' },
    { key: 'doubles',     label: 'Doubles' },
    { key: 'triples',     label: 'Triples' },
    { key: 'strikeouts',  label: 'Strikeouts' },
    { key: 'walks',       label: 'Walks' },
] as const;

// Corresponding types of the axes
type XStatKey = typeof X_STAT_OPTIONS[number]['key'];
type YStatKey = typeof Y_STAT_OPTIONS[number]['key'];

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
    const playerLogs = atBatLogs
        .filter(r => r.batter_id === playerId && !r.flagged_batter_row)
        .sort((a, b) => a.log_id - b.log_id);

    const points: ChartPoint[] = [];
    let cumulativeX = 0;
    let cumulativeY = 0;

    for (const log of playerLogs) {
        // With at_bats, we increase X on anything except a walk
        if (xStat === 'at_bats') {
            if (log.outcome_sign !== 'BB') cumulativeX++;

        // With plate_appearances, we simply increase X on every log
        } else if (xStat === 'plate_appearances') {
            cumulativeX++;
        }

        // With home runs, if our outcome is a HR or IPHR, we increase Y
        if (yStat === 'hr') {
            if (log.outcome_sign === 'HR' || log.outcome_sign === 'IPHR') cumulativeY++;
        } else if (yStat === 'hits') {
            if (REACHED_BASE_SIGNS.has(log.outcome_sign)) cumulativeY++;
        } else if (yStat === 'doubles') {
            if (log.outcome_sign === '2B') cumulativeY++;
        } else if (yStat === 'triples') {
            if (log.outcome_sign === '3B') cumulativeY++;
        } else if (yStat === 'strikeouts') {
            if (STRIKEOUT_SIGNS.has(log.outcome_sign)) cumulativeY++;
        } else if (yStat === 'walks') {
            if (log.outcome_sign === 'BB') cumulativeY++;
        }

        // Adds this point for this player
        points.push({ x: cumulativeX, y: cumulativeY });
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
    const { atBatLogs, isLoading } = useStatsData();

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

    // Pass 1: build raw points, skipping players with no stats
    const rawDataMap = players.reduce<Map<number, ChartPoint[]>>(
        (map, p) => {
            const [points, noStats] = buildPlayerChartData(atBatLogs, p.id, selectedXStat, selectedYStat);
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

            <div>
                <p>X Axis</p>
                <div className="radio-group">
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
                <div className="radio-group">
                    {Y_STAT_OPTIONS.map(o => (
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
            <ComposedChart margin={{ top: 10, right: 30, bottom: 30, left: 30 }}>
                <XAxis
                    dataKey="x"
                    type="number"
                    label={{ value: xLabel, position: 'insideBottom', offset: -15 }}
                />
                <YAxis
                    dataKey="yJitter"
                    label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 10 }}
                    allowDecimals={false}
                />
                {/*
                    Legend items are interactive: clicking a name hides/shows that player's
                    line, and hovering emphasizes it while dimming the others. Both events
                    live on the span so they share one target (no double-toggle).
                */}
                <Legend
                    verticalAlign="top"
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