export function computeAtBatDeltas(outcomeSign: string, rbis: number, recordedOuts: number) {
    const batterDelta: Record<string, number> = { plate_appearances: 1, at_bats: 1, runs_batted_in: rbis };
    const pitcherDelta: Record<string, number> = { pitched_outs: recordedOuts, batters_faced: 1 };

    switch (outcomeSign) {
        case 'reverse-K':
            batterDelta.strikeouts = 1;
            batterDelta.strikeouts_looking = 1;
            pitcherDelta.pitched_strikeouts = 1;
            pitcherDelta.pitched_strikeouts_looking = 1;
            break;
        case 'K':
            batterDelta.strikeouts = 1;
            batterDelta.strikeouts_swinging = 1;
            pitcherDelta.pitched_strikeouts = 1;
            pitcherDelta.pitched_strikeouts_swinging = 1;
            break;
        case 'BB':
            batterDelta.at_bats = 0;
            batterDelta.walks = 1;
            pitcherDelta.pitched_walks = 1;
            break;
        case '1B':
            batterDelta.hits = 1;
            batterDelta.singles = 1;
            pitcherDelta.hits_allowed = 1;
            break;
        case '2B':
            batterDelta.hits = 1;
            batterDelta.doubles = 1;
            pitcherDelta.hits_allowed = 1;
            break;
        case '3B':
            batterDelta.hits = 1;
            batterDelta.triples = 1;
            pitcherDelta.hits_allowed = 1;
            break;
        case 'HR':
            batterDelta.hits = 1;
            batterDelta.home_runs = 1;
            pitcherDelta.hits_allowed = 1;
            pitcherDelta.home_runs_allowed = 1;
            break;
        case 'IPHR':
            batterDelta.hits = 1;
            batterDelta.home_runs = 1;
            batterDelta.inside_the_park_home_runs = 1;
            pitcherDelta.hits_allowed = 1;
            break;
        case 'FC':
            batterDelta.fielders_choice = 1;
            break;
    }

    const filterZeros = (d: Record<string, number>) => Object.fromEntries(Object.entries(d).filter(([, v]) => v !== 0));
    return { batterDelta: filterZeros(batterDelta), pitcherDelta: filterZeros(pitcherDelta) };
}
