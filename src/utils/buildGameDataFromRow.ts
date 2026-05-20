import type { GameData, Player } from '../types';

export function buildGameDataFromRow(game: any, players: Player[]): GameData | null {
    const findPlayer = (id: number) => players.find(p => p.id === id);
    const awayLineup = (game.away_team_lineup_ids || []).map((id: number) => findPlayer(id)).filter(Boolean) as Player[];
    const homeLineup = (game.home_team_lineup_ids || []).map((id: number) => findPlayer(id)).filter(Boolean) as Player[];
    const awayPitcher = findPlayer(game.away_pitcher_id);
    const homePitcher = findPlayer(game.home_pitcher_id);

    if (!awayPitcher || !homePitcher || awayLineup.length === 0 || homeLineup.length === 0) return null;

    return {
        gameId: game.id,
        awayTeamLineup: awayLineup,
        homeTeamLineup: homeLineup,
        awayPitcher,
        homePitcher,
        awayTeamBatting: game.away_team_is_batting ?? true,
        inning: game.inning ?? 1,
        numberOfOuts: game.number_of_outs ?? 0,
        awayRuns: game.away_score ?? 0,
        homeRuns: game.home_score ?? 0,
        currAwayTeamBatter: game.current_away_team_batter_index ?? 0,
        currHomeTeamBatter: game.current_home_team_batter_index ?? 0,
        isGameOver: game.game_over ?? false,
    };
}
