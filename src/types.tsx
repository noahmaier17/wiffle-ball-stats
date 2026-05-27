import type { JSX } from "react";
import ReverseK from "./components/ReverseK";
import type { AT_BAT_OUTCOMES } from "./constants";

export type AtBatOutcomeSign = typeof AT_BAT_OUTCOMES[number]['sign']

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
    strikeouts: number,
    strikeouts_swinging: number,
    strikeouts_looking: number,
    
    win: number,
    loss: number,

    games_pitched: number,
    runs_allowed: number,
    pitched_strikeouts: number,
    pitched_strikeouts_swinging: number,
    pitched_strikeouts_looking: number,
    pitched_walks: number,
    hits_allowed: number,
    home_runs_allowed: number,
    innings_pitched: number,
    pitched_outs: number
}
export const calculateERA = (pde: PlayerGameData) => {
    const era = (pde.runs_allowed * 3) / pde.innings_pitched;

    return (Number.isFinite(era))
        ? era
        : 0
}
export const calculateWHIP = (pde: PlayerGameData) => {
    const whip = (pde.pitched_walks + pde.hits_allowed) / pde.innings_pitched;

    return (Number.isFinite(whip))
        ? whip
        : 0
}
export const defaultPlayerGameData: PlayerGameData = {
    id: 0, player_id: 0, game_id: 0,
    games_played: 0, at_bats: 0, doubles: 0, triples: 0,
    home_runs: 0, inside_the_park_home_runs: 0, runs_batted_in: 0,
    walks: 0, strikeouts: 0, strikeouts_swinging: 0, strikeouts_looking: 0,
    win: 0, loss: 0, games_pitched: 0, runs_allowed: 0,
    pitched_strikeouts: 0, pitched_strikeouts_swinging: 0,
    pitched_strikeouts_looking: 0, pitched_walks: 0, hits_allowed: 0,
    home_runs_allowed: 0, innings_pitched: 0, pitched_outs: 0, hits: 0, 
    singles: 0, plate_appearances: 0
};

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

    numberOnBase: number; // how many players are currently on base; for ERA calculations
    earnedRunsQueue: [number, number][]; // queue for number of runners responsible for each pitcher id
                                         // [player_id, number_of_runners]; FIFO

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
    oldPitcher: Player;
    newPitcher: Player;
}

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

export type HomeAway = 'home' | 'away'

export type statViewTypes = 'default' | 'by_game'

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
                oldPitcher: findPlayer(pc.old_pitcher_id),
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