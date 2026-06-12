import type { Player, PlayerGameData } from '../types';
import { calculateERA, fmt3 } from '../types';
import { computeAllPlayerStatistics } from './computeAllPlayerStatistics';
import type { StatsGameRow } from '../contexts/StatsDataContext';

function fmtIP(pitchedOuts: number): string {
    const full = Math.floor(pitchedOuts / 3);
    const extra = pitchedOuts % 3;
    return `${full}.${extra}`;
}

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

    const batters = sorted.filter(p => (statsMap.get(p.id)?.games_played ?? 0) > 0);
    const battingRows = batters.map(p => {
        const s = statsMap.get(p.id)!;
        return `| ${p.firstName} ${p.lastName} | ${s.games_played} | ${s.plate_appearances} | ${s.at_bats} | ${s.hits} | ${s.singles} | ${s.doubles} | ${s.triples} | ${s.home_runs} | ${s.runs_batted_in} | ${s.walks} | ${s.strikeouts} | ${fmt3(s.hits / s.at_bats)} | ${fmt3((s.hits + s.walks) / s.plate_appearances)} |`;
    });

    const pitchers = sorted.filter(p => (statsMap.get(p.id)?.games_pitched ?? 0) > 0);
    const pitchingRows = pitchers.map(p => {
        const s = statsMap.get(p.id)!;
        return `| ${p.firstName} ${p.lastName} | ${s.games_pitched} | ${fmtIP(s.pitched_outs)} | ${s.hits_allowed} | ${s.runs_allowed} | ${s.pitched_walks} | ${s.pitched_strikeouts} | ${calculateERA(s)} |`;
    });

    const sections: string[] = [
        '## League Members',
        players.map(p => `${p.firstName} ${p.lastName}`).join(', '),
        '',
        '## All-Time Batting Stats',
        '| Player | GP | PA | AB | H | 1B | 2B | 3B | HR | RBI | BB | K | AVG | OBP |',
        '|--------|----|----|----|----|----|----|----|----|-----|----|----|-----|-----|',
        ...battingRows,
        '',
        '## All-Time Pitching Stats',
        '| Player | GP | IP | H | R | BB | K | ERA |',
        '|--------|----|----|---|---|----|----|-----|',
        ...(pitchingRows.length > 0 ? pitchingRows : ['| (no pitching data yet) |']),
    ];

    if (selectedPlayerId !== null) {
        const gameMap = new Map(games.map(g => [g.id, g]));
        const playerRows = playerGameStats
            .filter(r => r.player_id === selectedPlayerId)
            .map(r => ({ r, game: gameMap.get(r.game_id) }))
            .filter((x): x is { r: PlayerGameData; game: StatsGameRow } => x.game !== undefined)
            .sort((a, b) => a.game.date.localeCompare(b.game.date));

        if (playerRows.length > 0) {
            const perGameRows = playerRows.map(({ r, game }, i) => {
                const date = new Date(game.date + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                const avg = fmt3(r.hits / r.at_bats);
                return `| ${i + 1} | ${date} | ${r.at_bats} | ${r.hits} | ${r.home_runs} | ${r.runs_batted_in} | ${r.walks} | ${r.strikeouts} | ${avg} |`;
            });

            sections.push(
                '',
                '## Your Game-by-Game Batting Stats (oldest to most recent; last row = most recent game)',
                '| # | Date | AB | H | HR | RBI | BB | K | AVG |',
                '|---|------|----|----|-----|-----|----|----|-----|',
                ...perGameRows,
            );
        }
    }

    return sections.join('\n');
}
