import type { AT_BAT_OUTCOMES } from "./constants";

export type AtBatOutcomeSign = typeof AT_BAT_OUTCOMES[number]['sign']

export type AtBatLogList = {
    batter: string, 
    pitcher: string, 
    rbis: number, 
    outcomeSign: AtBatOutcomeSign, 
    extraComments: string
}