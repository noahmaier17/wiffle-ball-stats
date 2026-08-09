import type { Player, PlayerGameData } from '../types';
import {
    calculateBattingAverage, calculateERA, calculateOnBasePercentage,
    calculateOnBasePlusSlugging, calculateSluggingPercentage, calculateTotalBases,
    calculateWHIP, formatStreak,
} from '../types';
import { computeAllPlayerStatistics } from './computeAllPlayerStatistics';
import { PARK_DISPLAY_NAMES } from '../constants';
import type { StatsGameRow } from '../contexts/StatsDataContext';

function fmtIP(pitchedOuts: number): string {
    const full = Math.floor(pitchedOuts / 3);
    const extra = pitchedOuts % 3;
    return `${full}.${extra}`;
}

const row = (cells: (string | number)[]) => `| ${cells.join(' | ')} |`;
const divider = (headerCells: string[]) => row(headerCells.map(() => '---'));

// Columns that were added to the schema later (such as fielders_choice) are null on older
// rows, so every value is coerced to a number before it is printed or divided.
const withZeroes = (pde: PlayerGameData): PlayerGameData => Object.fromEntries(
    Object.entries(pde).map(([key, value]) => [key, Number.isFinite(value) ? value : 0])
) as PlayerGameData;

// Batting columns shared by the all-time table and the per-game table.
// The leading columns differ (player/streaks vs. date/result), so they are passed in separately.
const BATTING_COLUMNS = [
    'PA', 'AB', 'H', '1B', '2B', '3B', 'HR', 'IPHR', 'RBI', 'BB',
    'Ksw', 'Klk', 'SO', 'FC', 'TB', 'AVG', 'OBP', 'SLG', 'OPS',
];
const battingCells = (pde: PlayerGameData): (string | number)[] => {
    const s = withZeroes(pde);
    return [
        s.plate_appearances, s.at_bats, s.hits, s.singles, s.doubles, s.triples,
        s.home_runs, s.inside_the_park_home_runs, s.runs_batted_in, s.walks,
        s.strikeouts_swinging, s.strikeouts_looking, s.strikeouts, s.fielders_choice,
        calculateTotalBases(s), calculateBattingAverage(s), calculateOnBasePercentage(s),
        calculateSluggingPercentage(s), calculateOnBasePlusSlugging(s),
    ];
};

const PITCHING_COLUMNS = ['IP', 'BF', 'H', 'R', 'HR', 'BB', 'Ksw', 'Klk', 'SO', 'ERA', 'WHIP'];
const pitchingCells = (pde: PlayerGameData): (string | number)[] => {
    // Derive innings_pitched from pitched_outs so raw per-game rows use the same
    // baseball notation (1.2 = 1 inning and 2 outs) that the aggregated totals do
    const s = withZeroes(pde);
    s.innings_pitched = Math.floor(s.pitched_outs / 3) + (s.pitched_outs % 3) / 10;
    return [
        fmtIP(s.pitched_outs), s.batters_faced, s.hits_allowed, s.runs_allowed,
        s.home_runs_allowed, s.pitched_walks, s.pitched_strikeouts_swinging,
        s.pitched_strikeouts_looking, s.pitched_strikeouts, calculateERA(s), calculateWHIP(s),
    ];
};

const GLOSSARY = [
    '## Stat Glossary',
    'Batting: G = games played, W / L = team wins / losses in games this player appeared in, STK = current streak (W# = winning, L# = losing), LWS / LLS = longest win / loss streak, PA = plate appearances, AB = at bats, H = hits, 1B / 2B / 3B = singles / doubles / triples, HR = home runs, IPHR = inside the park home runs (already counted inside HR), RBI = runs batted in, BB = walks drawn, Ksw / Klk = strikeouts swinging / looking, SO = total strikeouts, FC = reached on fielder\'s choice, TB = total bases, AVG = batting average (H / AB), OBP = on base percentage ((H + BB) / PA), SLG = slugging percentage (TB / AB), OPS = OBP + SLG.',
    'Pitching: GP = games pitched, IP = innings pitched written in baseball notation where the digit after the decimal is extra outs (1.2 means 1 inning and 2 outs), BF = batters faced, H = hits allowed, R = runs allowed, HR = home runs allowed, BB = walks allowed, Ksw / Klk / SO = strikeouts thrown swinging / looking / total, ERA = earned runs per 3 inning game, WHIP = walks plus hits per inning pitched.',
    'A value of ".---" or ".--" means the stat is undefined because the denominator is zero. FC was not tracked for the first few league games, so early FC totals read 0.',
];

export function buildChatContext(
    playerGameStats: PlayerGameData[],
    players: Player[],
    selectedPlayerId: number | null,
    games: StatsGameRow[],
): string {
    const [statsMap] = computeAllPlayerStatistics(playerGameStats, { batterIds: players });

    const sorted = [...players].sort((a, b) => {
        const sa = statsMap.get(a.id)!;
        const sb = statsMap.get(b.id)!;
        return sb.games_played - sa.games_played;
    });

    const battingHeader = ['Player', 'G', 'W', 'L', 'STK', 'LWS', 'LLS', ...BATTING_COLUMNS];
    const batters = sorted.filter(p => (statsMap.get(p.id)?.games_played ?? 0) > 0);
    const battingRows = batters.map(p => {
        const s = statsMap.get(p.id)!;
        return row([
            `${p.firstName} ${p.lastName}`, s.games_played, s.win, s.loss,
            formatStreak(s.current_streak), s.longest_win_streak, s.longest_loss_streak,
            ...battingCells(s),
        ]);
    });

    const pitchingHeader = ['Player', 'GP', ...PITCHING_COLUMNS];
    const pitchers = sorted.filter(p => (statsMap.get(p.id)?.games_pitched ?? 0) > 0);
    const pitchingRows = pitchers.map(p => {
        const s = statsMap.get(p.id)!;
        return row([`${p.firstName} ${p.lastName}`, s.games_pitched, ...pitchingCells(s)]);
    });

    const sections: string[] = [
        ...GLOSSARY,
        '',
        '## League Members',
        players.map(p => `${p.firstName} ${p.lastName}`).join(', '),
        '',
        '## All-Time Batting Stats',
        row(battingHeader),
        divider(battingHeader),
        ...battingRows,
        '',
        '## All-Time Pitching Stats',
        row(pitchingHeader),
        divider(pitchingHeader),
        ...(pitchingRows.length > 0 ? pitchingRows : ['| (no pitching data yet) |']),
    ];

    if (selectedPlayerId !== null) {
        const gameMap = new Map(games.map(g => [g.id, g]));
        const playerRows = playerGameStats
            .filter(r => r.player_id === selectedPlayerId)
            .map(r => ({ r, game: gameMap.get(r.game_id) }))
            .filter((x): x is { r: PlayerGameData; game: StatsGameRow } => x.game !== undefined)
            .sort((a, b) => a.game.date.localeCompare(b.game.date));

        const fmtDate = (game: StatsGameRow) =>
            new Date(game.date + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const result = (r: PlayerGameData) => r.win === 1 ? 'W' : r.loss === 1 ? 'L' : '-';

        if (playerRows.length > 0) {
            const perGameHeader = ['#', 'Date', 'Park', 'Fielders', 'Result', ...BATTING_COLUMNS];
            const perGameRows = playerRows.map(({ r, game }, i) => row([
                i + 1, fmtDate(game), PARK_DISPLAY_NAMES[game.field] ?? game.field,
                game.number_of_fielders, result(r), ...battingCells(r),
            ]));

            sections.push(
                '',
                '## Your Game-by-Game Batting Stats (oldest to most recent; last row = most recent game)',
                row(perGameHeader),
                divider(perGameHeader),
                ...perGameRows,
            );
        }

        const pitchedRows = playerRows.filter(({ r }) => r.games_pitched > 0);
        if (pitchedRows.length > 0) {
            const perGamePitchingHeader = ['#', 'Date', 'Result', ...PITCHING_COLUMNS];
            const perGamePitchingRows = pitchedRows.map(({ r, game }, i) => row([
                i + 1, fmtDate(game), result(r), ...pitchingCells(r),
            ]));

            sections.push(
                '',
                '## Your Game-by-Game Pitching Stats (oldest to most recent; last row = most recent game)',
                row(perGamePitchingHeader),
                divider(perGamePitchingHeader),
                ...perGamePitchingRows,
            );
        }
    }

    return sections.join('\n');
}
