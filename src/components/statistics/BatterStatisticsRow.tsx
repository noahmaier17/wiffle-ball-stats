import { playerName, type Player, type PlayerGameData } from "../../types";

type BatterStatisticsRowProps = {
    pde: PlayerGameData;
    player?: Player;
};

function BatterStatisticsRow({ pde, player }: BatterStatisticsRowProps) {
    const safePde = Object.fromEntries(
        Object.entries(pde).map(([key, value]) => (
            [ key, Number.isFinite(value) ? value : 0 ]
        )
    )) as PlayerGameData;

    const safeDiv = (number: number) => {
        return (Number.isFinite(number))
            ? number
            : 0
    }

    const battingAverage = safeDiv(safePde.hits / safePde.at_bats).toFixed(3);
    const onBasePercentage = safeDiv((safePde.hits + safePde.walks) / safePde.plate_appearances).toFixed(3);
    const totalBases = (
        safePde.singles * 1 +
        safePde.doubles * 2 +
        safePde.triples * 3 +
        safePde.home_runs * 4
    );
    const sluggingPercentage = safeDiv(totalBases / safePde.at_bats).toFixed(3);
    const onBasePlusSlugging = safeDiv(
        ((safePde.hits + safePde.walks) / safePde.plate_appearances)
        + (totalBases / safePde.at_bats)
    ).toFixed(3);

    return (
        <tr>
            {player && <td>{playerName(player)}</td>}
            <td>{safePde.games_played}</td>
            <td>{safePde.win}</td>
            <td>{safePde.loss}</td>
            <td>{safePde.at_bats}</td>
            <td>{safePde.hits}</td>
            <td>{safePde.singles}</td>
            <td>{safePde.doubles}</td>
            <td>{safePde.triples}</td>
            <td>{safePde.home_runs}</td>
            <td>{safePde.inside_the_park_home_runs}</td>
            <td>{safePde.runs_batted_in}</td>
            <td>{safePde.walks}</td>
            <td>{safePde.strikeouts_swinging}</td>
            <td>{safePde.strikeouts_looking}</td>
            <td>{safePde.strikeouts}</td>
            <td>{battingAverage}</td>
            <td>{onBasePercentage}</td>
            <td>{sluggingPercentage}</td>
            <td>{onBasePlusSlugging}</td>
            <td>{totalBases}</td>
        </tr>
    );
}

export default BatterStatisticsRow