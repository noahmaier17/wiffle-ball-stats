import type { AT_BAT_OUTCOMES } from "./constants";

export type AtBatOutcomeSign = typeof AT_BAT_OUTCOMES[number]['sign']

export type AtBatLog = {
    type: 'atbat', // TODO: Remove
    batter: string,
    pitcher: string,
    rbis: number,
    outcomeSign: AtBatOutcomeSign,
    extraComments: string
}

export type Player = {
    id: number;
    firstName: string;
    lastName: string;
}
export const playerName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`;

export type GameData = {
    gameId: number;
    awayTeamLineup: Player[]; // The away team lineup; does not change once set
    homeTeamLineup: Player[]; // The home team lineup; does not change once set
    awayPitcher: Player;
    homePitcher: Player;

    awayTeamBatting: boolean;
    inning: number;
    numberOfOuts: number;

    awayRuns: number;
    homeRuns: number;

    currAwayTeamBatter: number; // index corresponding to next batter in `awayTeamLineup`
    currHomeTeamBatter: number; // index corresponding to next batter in `homeTeamLineup`
}

export type PitchingChangeLog = {
    type: 'pitching_change', // TODO: Remove
    newPitcher: string;
}

export type GameLogEntry = AtBatLog | PitchingChangeLog