import {
    calculateBattingAverage, calculateOnBasePercentage, calculateOnBasePlusSlugging,
    calculateSluggingPercentage, calculateTotalBases, formatStreak, fmt3,
    playerNameShort, type Player, type PlayerGameData, type statViewTypes
} from "../../types";

type BatterStatisticsRowProps = {
    pde: PlayerGameData;
    player?: Player;
    viewType: statViewTypes;
    index?: number;
};

function BatterStatisticsRow({ pde, player, viewType, index }: BatterStatisticsRowProps) {
    const display = (
        value: number,
        {
            isGameGranularityStatistic = false,
            isPlateAppearances = false,
            isAtBats = false,
        }: {
            isGameGranularityStatistic?: boolean,
            isPlateAppearances?: boolean,
            isAtBats?: boolean,
        } = {}
    ) => {
        return (viewType === 'by_game')
            ? (pdeWithZeroes.games_played === 0 ? '--' : (value / pdeWithZeroes.games_played).toFixed(2))
            : (viewType === 'by_PA_and_BF' && !isGameGranularityStatistic && !isPlateAppearances)
                ? (pdeWithZeroes.plate_appearances === 0 ? '--' : fmt3(value / pdeWithZeroes.plate_appearances))
                : (viewType === 'by_AB_and_IP' && !isGameGranularityStatistic && !isAtBats)
                    ? (pdeWithZeroes.at_bats === 0 ? '--' : fmt3(value / pdeWithZeroes.at_bats))
                    : value
    }

    // Fixes all malformed values by setting them to zero
    const pdeWithZeroes = Object.fromEntries(
        Object.entries(pde).map(([key, value]) => (
            [ key, Number.isFinite(value) ? value : 0 ]
        )
    )) as PlayerGameData;

    // Calculates other statistics
    const battingAverage = calculateBattingAverage(pdeWithZeroes);
    const onBasePercentage = calculateOnBasePercentage(pdeWithZeroes);
    const totalBases = calculateTotalBases(pdeWithZeroes);
    const sluggingPercentage = calculateSluggingPercentage(pdeWithZeroes);
    const onBasePlusSlugging = calculateOnBasePlusSlugging(pdeWithZeroes);

    return (
        <tr>
            {index !== undefined && <td>{`${index + 1}`}</td>}
            {player && <td>{playerNameShort(player)}</td>}
            <td>{pdeWithZeroes.games_played}</td>
            <td>{display(pdeWithZeroes.win, { isGameGranularityStatistic: true })}</td>
            <td>{display(pdeWithZeroes.loss, { isGameGranularityStatistic: true })}</td>
            <td>{pdeWithZeroes.current_streak === 0 ? '—' : formatStreak(pdeWithZeroes.current_streak)}</td>
            <td>{pdeWithZeroes.longest_win_streak}</td>
            <td>{pdeWithZeroes.longest_loss_streak}</td>
            <td>{display(pdeWithZeroes.plate_appearances, { isPlateAppearances: true })}</td>
            <td>{display(pdeWithZeroes.at_bats, { isAtBats: true })}</td>
            <td>{display(pdeWithZeroes.hits)}</td>
            <td>{display(pdeWithZeroes.singles)}</td>
            <td>{display(pdeWithZeroes.doubles)}</td>
            <td>{display(pdeWithZeroes.triples)}</td>
            <td>{display(pdeWithZeroes.home_runs)}</td>
            <td>{display(pdeWithZeroes.inside_the_park_home_runs)}</td>
            <td>{display(pdeWithZeroes.runs_batted_in)}</td>
            <td>{display(pdeWithZeroes.walks)}</td>
            <td>{display(pdeWithZeroes.strikeouts_swinging)}</td>
            <td>{display(pdeWithZeroes.strikeouts_looking)}</td>
            <td>{display(pdeWithZeroes.strikeouts)}</td>
            <td>{display(pdeWithZeroes.fielders_choice)}</td>
            <td>{display(totalBases)}</td>
            <td>{battingAverage}</td>
            <td>{onBasePercentage}</td>
            <td>{sluggingPercentage}</td>
            <td>{onBasePlusSlugging}</td>
        </tr>
    );
}

export default BatterStatisticsRow