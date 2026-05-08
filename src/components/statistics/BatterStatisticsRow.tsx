import { playerName, type Player, type PlayerGameData } from "../../types";

type BatterStatisticsRowProps = {
    pde: PlayerGameData;
    player?: Player;
};

function BatterStatisticsRow({ pde, player }: BatterStatisticsRowProps) {
    const battingAverage = (pde.hits / pde.at_bats).toFixed(3);
    const onBasePercentage = ((pde.hits + pde.walks) / pde.plate_appearances).toFixed(3);
    const totalBases = (
        pde.singles * 1 +
        pde.doubles * 2 +
        pde.triples * 3 +
        pde.home_runs * 4
    );
    const sluggingPercentage = (totalBases / pde.at_bats).toFixed(3);
    const onBasePlusSlugging = (
        ((pde.hits + pde.walks) / pde.plate_appearances)
        + (totalBases / pde.at_bats)
    ).toFixed(3);

    return (
        <tr>
            {player && <td>{playerName(player)}</td>}
            <td>{pde.at_bats}</td>
            <td>{pde.hits}</td>
            <td>{pde.singles}</td>
            <td>{pde.doubles}</td>
            <td>{pde.triples}</td>
            <td>{pde.home_runs}</td>
            <td>{pde.inside_the_park_home_runs}</td>
            <td>{pde.runs_batted_in}</td>
            <td>{pde.walks}</td>
            <td>{pde.strikeouts}</td>
            <td>{battingAverage}</td>
            <td>{onBasePercentage}</td>
            <td>{sluggingPercentage}</td>
            <td>{onBasePlusSlugging}</td>
            <td>{totalBases}</td>
        </tr>
    );
}

export default BatterStatisticsRow