

export const AT_BAT_OUTCOMES_STRIKEOUTS = [
    { name: 'Strikeout Swinging', sign: 'K' }, 
    { name: 'Strikeout Looking', sign: 'reverse-K' }
]
export const AT_BAT_OUTCOMES_BASE_HITS = [
    { name: 'Single', sign: '1B' },
    { name: 'Double', sign: '2B' },
    { name: 'Triple', sign: '3B' },
    { name: 'HR', sign: 'HR' },
    { name: 'Inside the Park HR', sign: 'IPHR' }
]
export const AT_BAT_OUTCOMES_OTHER = [
    { name: 'Walk', sign: 'BB' },
    { name: 'Out', sign: 'Out' }
]

export const AT_BAT_OUTCOMES = [...AT_BAT_OUTCOMES_STRIKEOUTS, ...AT_BAT_OUTCOMES_BASE_HITS, ...AT_BAT_OUTCOMES_OTHER]