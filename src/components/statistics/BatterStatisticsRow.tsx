import { playerNameShort, type Player, type PlayerGameData, type statViewTypes } from "../../types";

type BatterStatisticsRowProps = {
    pde: PlayerGameData;
    player?: Player;
    viewType: statViewTypes
};

function BatterStatisticsRow({ pde, player, viewType }: BatterStatisticsRowProps) {
    const safeDiv = (number: number) => {
        return (Number.isFinite(number))
            ? number
            : 0
    }

    /*
    const statsByGame = (pde: PlayerGameData): PlayerGameData => {
        return {...pde,
            win: pde.win / pde.games_played,
            loss: pde.loss / pde.games_played,
            at_bats: pde.at_bats / pde.games_played,
            hits: pde.hits / pde.games_played,
            singles: pde.singles / pde.games_played,
            doubles: pde.doubles / pde.games_played,
            triples: pde.triples / pde.games_played,
            home_runs: pde.home_runs / pde.games_played,
            inside_the_park_home_runs: pde.inside_the_park_home_runs / pde.games_played,
            runs_batted_in: pde.runs_batted_in / pde.games_played,
            walks: pde.walks / pde.games_played,
            strikeouts: pde.strikeouts / pde.games_played,
            strikeouts_looking: pde.strikeouts_looking / pde.games_played,
            strikeouts_swinging: pde.strikeouts_swinging / pde.games_played
        }
    } */
    const display = (value: number, isGameGranularityStatistic: boolean = false) => {
        return (viewType === 'by_game') 
            ? (value / pdeWithZeroes.games_played).toFixed(2) 
            : value
    }

    // Fixes all malformed values by setting them to zero
    const pdeWithZeroes = Object.fromEntries(
        Object.entries(pde).map(([key, value]) => (
            [ key, Number.isFinite(value) ? value : 0 ]
        )
    )) as PlayerGameData;

    // Calculates other statistics
    const battingAverage = safeDiv(pdeWithZeroes.hits / pdeWithZeroes.at_bats).toFixed(3);
    const onBasePercentage = safeDiv((pdeWithZeroes.hits + pdeWithZeroes.walks) / pdeWithZeroes.plate_appearances).toFixed(3);
    const totalBases = (
        pdeWithZeroes.singles * 1 +
        pdeWithZeroes.doubles * 2 +
        pdeWithZeroes.triples * 3 +
        pdeWithZeroes.home_runs * 4
    );
    const sluggingPercentage = safeDiv(totalBases / pdeWithZeroes.at_bats).toFixed(3);
    const onBasePlusSlugging = safeDiv(
        ((pdeWithZeroes.hits + pdeWithZeroes.walks) / pdeWithZeroes.plate_appearances)
        + (totalBases / pdeWithZeroes.at_bats)
    ).toFixed(3);

    return (
        <tr>
            {player && <td>{playerNameShort(player)}</td>}
            <td>{pdeWithZeroes.games_played}</td>
            <td>{display(pdeWithZeroes.win)}</td>
            <td>{display(pdeWithZeroes.loss)}</td>
            <td>{display(pdeWithZeroes.at_bats)}</td>
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
            <td>{display(totalBases)}</td>
            <td>{battingAverage}</td>
            <td>{onBasePercentage}</td>
            <td>{sluggingPercentage}</td>
            <td>{onBasePlusSlugging}</td>
        </tr>
    );
}

export default BatterStatisticsRow