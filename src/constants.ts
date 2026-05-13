
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
]

export const AT_BAT_OUTCOMES_STRIKEOUTS = AT_BAT_OUTCOME_LAYOUT.flat().filter(o => STRIKEOUT_SIGNS.has(o.sign))
export const AT_BAT_OUTCOMES = AT_BAT_OUTCOME_LAYOUT.flat()
