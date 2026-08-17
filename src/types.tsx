import type { JSX } from "react";
import ReverseK from "./components/ReverseK";
import type { Player, Park, AtBatOutcomeSign, HomeAway } from "./stats-core";

// Pure stat types and math live in stats-core.ts so server-side code can import them
// without pulling in React. They are re-exported here so existing imports from '../types'
// keep working unchanged.
// eslint-disable-next-line react-refresh/only-export-components -- stats-core exports no components
export * from "./stats-core";

export type AtBatLog = {
    type: 'atbat',
    logId: number,
    batter: Player,
    pitcher: Player,
    rbis: number,
    recordedOuts: number,
    outcomeSign: AtBatOutcomeSign,
    extraComments: string
}

export type GameData = {
    gameId: number;
    field: Park; // The park this game is played at
    awayTeamLineup: Player[]; // The away team lineup; does not change once set
    homeTeamLineup: Player[]; // The home team lineup; does not change once set
    awayAlltimeDefensePlayers: Player[]; // Pitcher-only players for away team; not in batting order
    homeAlltimeDefensePlayers: Player[]; // Pitcher-only players for home team; not in batting order
    awayPitcher: Player | null;
    homePitcher: Player | null;

    awayTeamBatting: boolean;
    inning: number;
    numberOfOuts: number;

    awayRuns: number;
    homeRuns: number;

    currAwayTeamBatter: number; // index corresponding to next batter in `awayTeamLineup`
    currHomeTeamBatter: number; // index corresponding to next batter in `homeTeamLineup`

    numberOnBase: number; // how many players are currently on base; for ERA calculations
    earnedRunsQueue: number[]; // each entry is a pitcherId; index i = pitcher responsible for ith next run scored

    isGameOver: boolean;
}
export const currLineupAndBatterIndex = (gameData: GameData): [Player[], number] => {
    const {
        awayTeamBatting,
        awayTeamLineup,
        homeTeamLineup,
        currAwayTeamBatter,
        currHomeTeamBatter
    } = gameData;

    const currLineup = awayTeamBatting ? awayTeamLineup : homeTeamLineup
    const currBatterNumber = awayTeamBatting ? currAwayTeamBatter : currHomeTeamBatter
    return [currLineup, currBatterNumber]
}
export const currAtBat = (gameData: GameData) => {
    // Gets the current lineup and current lineup's position
    const [currLineup, currBatterNumber] = currLineupAndBatterIndex(gameData);

    // Gets who's at bat
    return currLineup[currBatterNumber]
}
export const currOnDeck = (gameData: GameData) => {
    // Gets the current lineup and current lineup's position
    const [currLineup, currBatterNumber] = currLineupAndBatterIndex(gameData);

    // Gets who's on deck
    return currLineup[(currBatterNumber + 1) % currLineup.length]
}
export const currInHole = (gameData: GameData) => {
    // Gets the current lineup and current lineup's position
    const [currLineup, currBatterNumber] = currLineupAndBatterIndex(gameData);

    // Gets who's on deck
    return currLineup[(currBatterNumber + 2) % currLineup.length]
}

export type PitchingChangeLog = {
    type: 'pitching_change';
    teamChangingPitchers: HomeAway;
    oldPitcher: Player | null;
    newPitcher: Player;
}

// If we have a game log stream that is incomplete or inconsistent, we use `gamestate_replay_issue`
//  The user cannot log such a log; it is only used when replaying game state
// If a user logged a logging issue, we use `logging_issue`
// Otherwise, we use `other`
export type TypeOfInfo = 'gamestate_replay_issue' | 'logging_issue' | 'other'
export type AdditionalInformationLog = {
    type: 'additional_information';
    info: string;
    typeOfInfo: TypeOfInfo;
}

export type InningSwitchLog = {
    type: 'inning_switch'
}

export type EditGamestateLog = {
    type: 'edit_gamestate';
    newGameData: GameData;
    info: string;
}

export type GameLogEntry = AtBatLog | PitchingChangeLog | AdditionalInformationLog | InningSwitchLog | EditGamestateLog

export const rowToLogEntry = (row: any, findPlayer: (id: number) => Player): GameLogEntry => {
    switch (row.type) {
        case 'atbat': {
            const ab = row.at_bat_logs;
            if (!ab) return { type: 'additional_information', info: `Missing at bat`, typeOfInfo: 'gamestate_replay_issue' };
            return {
                type: 'atbat',
                logId: row.id,
                batter: findPlayer(ab.batter_id),
                pitcher: findPlayer(ab.pitcher_id),
                rbis: ab.rbis,
                recordedOuts: ab.recorded_outs,
                outcomeSign: ab.outcome_sign as AtBatOutcomeSign,
                extraComments: ab.extra_comments ?? '',
            };
        }
        case 'pitching_change': {
            const pc = row.pitching_change_logs;
            if (!pc) return { type: 'additional_information', info: `Missing pitching change`, typeOfInfo: 'gamestate_replay_issue' };
            return {
                type: 'pitching_change',
                teamChangingPitchers: pc.team_changing as HomeAway,
                oldPitcher: pc.old_pitcher_id != null ? findPlayer(pc.old_pitcher_id) : null,
                newPitcher: findPlayer(pc.new_pitcher_id),
            };
        }
        case 'additional_information': {
            const ai = row.additional_information_logs;
            if (!ai) return { type: 'additional_information', info: `Missing additional info`, typeOfInfo: 'gamestate_replay_issue' };
            return {
                type: 'additional_information',
                info: ai.info,
                typeOfInfo: (ai.type_of_info ?? 'other') as TypeOfInfo,
            };
        }
        case 'inning_switch':
            return { type: 'inning_switch' };
        case 'edit_gamestate': {
            const eg = row.edit_gamestate_logs;
            if (!eg) return { type: 'additional_information', info: `Missing edit gamestate log`, typeOfInfo: 'gamestate_replay_issue' };
            return {
                type: 'edit_gamestate',
                newGameData: eg.new_game_data,
                info: eg.info,
            };
        }
        default:
            throw new Error(`Unknown log type: ${row.type}`);
    }
};

export const outcomeSignToJSXElement = (outcome: string): JSX.Element => {
    return (outcome === 'reverse-K')
        ? ReverseK()
        : <>{outcome}</>
}

export const atBatLogSummary = (entry: AtBatLog): string => {
    const rbiPart = entry.rbis > 0 ? `, ${entry.rbis} RBI` : '';
    const outsPart = entry.recordedOuts > 0
        ? ` (${entry.recordedOuts} out${entry.recordedOuts > 1 ? 's' : ''})`
        : '';
    return `${entry.outcomeSign}${rbiPart}${outsPart}`;
};
