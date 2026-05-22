
const STRIKEOUT_SIGNS = new Set(['K', 'reverse-K'])

export const AT_BAT_OUTCOME_LAYOUT = [
    [
        { name: 'Single', sign: '1B' },
        { name: 'Double', sign: '2B' },
        { name: 'Triple', sign: '3B' },
        { name: 'HR', sign: 'HR' },
        { name: 'Inside the Park HR', sign: 'IPHR' },
    ],
    [
        { name: 'Walk', sign: 'BB' },
        { name: 'Out', sign: 'Out' },
        { name: 'Strikeout Swinging', sign: 'K' },
        { name: 'Strikeout Looking', sign: 'reverse-K' },
        { name: 'Fielder\'s Choice', sign: 'FC' }
    ],
] as const
export const REACHED_BASE_SIGNS = new Set(['1B', '2B', '3B', 'HR', 'IPHR', 'BB', 'FC']);
export const BASE_HIT_SIGNS = new Set(['1B', '2B', '3B']);
export const OUT_IN_PLAY_SIGNS = new Set(['Out']);

export const AT_BAT_OUTCOMES_STRIKEOUTS = AT_BAT_OUTCOME_LAYOUT.flat().filter(o => STRIKEOUT_SIGNS.has(o.sign))
export const AT_BAT_OUTCOMES = AT_BAT_OUTCOME_LAYOUT.flat()
