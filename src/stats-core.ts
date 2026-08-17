// Pure stat types and math, with no React dependency.
//
// This is split out of types.tsx so server-side code (the Vercel functions in api/)
// can import stat helpers without pulling React and the ReverseK component into the
// serverless bundle. types.tsx re-exports everything here, so client code can keep
// importing from '../types' as before.

import type { AT_BAT_OUTCOMES, PARKS } from "./constants";

// Park Type
export type Park = typeof PARKS[number];

export type AtBatOutcomeSign = typeof AT_BAT_OUTCOMES[number]['sign']

export type HomeAway = 'home' | 'away'

export type statViewTypes = 'default' | 'by_game' | 'by_PA_and_BF' | 'by_AB_and_IP'

export type Player = {
    id: number;
    firstName: string;
    lastName: string;
}
export const playerName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`;
export const makeFindPlayer = (players: Player[]) => (id: number): Player =>
    players.find(p => p.id === id) ?? { id, firstName: 'Error', lastName: 'Player' };
export const playerNameShort = (p: { firstName: string; lastName: string }) => `${p.firstName.charAt(0)}. ${p.lastName}`;

export type PlayerGameData = {
    id: number,
    player_id: number,
    game_id: number,
    games_played: number,
    at_bats: number,
    hits: number,
    plate_appearances: number
    singles: number,
    doubles: number,
    triples: number,
    home_runs: number,
    inside_the_park_home_runs: number,
    runs_batted_in: number,
    walks: number,
    fielders_choice: number,
    strikeouts: number,
    strikeouts_swinging: number,
    strikeouts_looking: number,

    win: number,
    loss: number,

    current_streak: number,
    longest_win_streak: number,
    longest_loss_streak: number,

    games_pitched: number,
    runs_allowed: number,
    pitched_strikeouts: number,
    pitched_strikeouts_swinging: number,
    pitched_strikeouts_looking: number,
    pitched_walks: number,
    hits_allowed: number,
    home_runs_allowed: number,
    innings_pitched: number,
    pitched_outs: number,
    batters_faced: number
}

export const NON_FINITE_FMT3_VALUE = '.---'
export function fmt3(n: number): string {
    if (!Number.isFinite(n)) return NON_FINITE_FMT3_VALUE;
    return n.toFixed(3).replace(/^0/, '');
}
export const NON_FINITE_FMT2_VALUE = '.--'
export function fmt2(n: number): string {
    if (!Number.isFinite(n)) return NON_FINITE_FMT2_VALUE;
    return n.toFixed(2).replace(/^0/, '');
}
// home_runs already includes inside the park home runs, so IPHR is not added separately
export const calculateTotalBases = (pde: PlayerGameData): number => {
    return pde.singles + pde.doubles * 2 + pde.triples * 3 + pde.home_runs * 4;
}

// Rate stats as raw numbers. Callers that need to sort, compare, or choose their own
// precision use these; the calculate* helpers below wrap them for display. Each can return
// a non-finite value when the denominator is zero, which fmt2/fmt3 render as .-- / .---
export const battingAverage = (pde: PlayerGameData): number => {
    return pde.hits / pde.at_bats;
}
export const onBasePercentage = (pde: PlayerGameData): number => {
    return (pde.hits + pde.walks) / pde.plate_appearances;
}
export const sluggingPercentage = (pde: PlayerGameData): number => {
    return calculateTotalBases(pde) / pde.at_bats;
}
export const onBasePlusSlugging = (pde: PlayerGameData): number => {
    return onBasePercentage(pde) + sluggingPercentage(pde);
}
// Divides by innings_pitched, which is baseball notation (1.2 means 1 inning + 2 outs)
export const era = (pde: PlayerGameData): number => {
    return (pde.runs_allowed * 3) / pde.innings_pitched;
}
export const whip = (pde: PlayerGameData): number => {
    return (pde.pitched_walks + pde.hits_allowed) / pde.innings_pitched;
}

// Display wrappers around the numeric functions above.
export const calculateERA = (pde: PlayerGameData): string => {
    return fmt2(era(pde));
}
export const calculateWHIP = (pde: PlayerGameData): string => {
    return fmt2(whip(pde));
}
export const calculateBattingAverage = (pde: PlayerGameData): string => {
    return fmt3(battingAverage(pde));
}
export const calculateOnBasePercentage = (pde: PlayerGameData): string => {
    return fmt3(onBasePercentage(pde));
}
export const calculateSluggingPercentage = (pde: PlayerGameData): string => {
    return fmt3(sluggingPercentage(pde));
}
export const calculateOnBasePlusSlugging = (pde: PlayerGameData): string => {
    return fmt3(onBasePlusSlugging(pde));
}
// Formats a signed streak: >0 is a win streak, <0 is a loss streak
export const formatStreak = (streak: number): string => {
    return (streak > 0) ? `W${streak}` : (streak < 0) ? `L${-streak}` : 'none';
}
export const defaultPlayerGameData: PlayerGameData = {
    id: 0, player_id: 0, game_id: 0,
    games_played: 0, at_bats: 0, doubles: 0, triples: 0,
    home_runs: 0, inside_the_park_home_runs: 0, runs_batted_in: 0,
    walks: 0, fielders_choice: 0, strikeouts: 0, strikeouts_swinging: 0,
    strikeouts_looking: 0, win: 0, loss: 0,
    current_streak: 0, longest_win_streak: 0, longest_loss_streak: 0,
    games_pitched: 0, runs_allowed: 0,
    pitched_strikeouts: 0, pitched_strikeouts_swinging: 0,
    pitched_strikeouts_looking: 0, pitched_walks: 0, hits_allowed: 0,
    home_runs_allowed: 0, innings_pitched: 0, pitched_outs: 0, hits: 0,
    singles: 0, plate_appearances: 0, batters_faced: 0
};

export const ordinalNumber = (number: number): string => {
    switch (number) {
        case 1:
            return "1st"
        case 2:
            return "2nd"
        case 3:
            return "3rd"
        default:
            return number.toString() + "th"
    }
}
