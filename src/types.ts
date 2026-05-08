import type { AT_BAT_OUTCOMES } from "./constants";

export type AtBatOutcomeSign = typeof AT_BAT_OUTCOMES[number]['sign']

export type AtBatLog = {
    type: 'atbat',
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

export type PlayerGameData = {
    id: number,
    player_id: number,
    game_id: number,
    games_played: number,
    at_bats: number,
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
    innings_pitched: number,
    pitched_outs: number,
    hits: number,
    singles: number,
    plate_appearances: number
}
export const calculateERA = (pde: PlayerGameData) => {
    const era = (pde.runs_allowed * 3) / pde.innings_pitched;

    return (Number.isFinite(era))
        ? era
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
    innings_pitched: 0, pitched_outs: 0, hits: 0, singles: 0, plate_appearances: 0
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

    isGameOver?: boolean;
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

export type AdditionalInformationLog = {
    type: 'additional_information';
    info: string;
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

export const ordinalNumber = (number: number) => {
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