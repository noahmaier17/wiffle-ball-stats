import { calculateERA, playerName, type Player, type PlayerGameData } from "../../types";

type PitcherStatisticsRowProps = {
    pde: PlayerGameData;
    player?: Player;
};

function PitcherStatisticsRow({ pde, player }: PitcherStatisticsRowProps) {
    return (
        <tr>
            {player && <td>{playerName(player)}</td>}
            <td>{pde.innings_pitched.toFixed(1)}</td>
            <td>{calculateERA(pde).toFixed(2)}</td>
            <td>{pde.games_pitched}</td>
            <td>{pde.hits_allowed}</td>
            <td>{pde.runs_allowed}</td>
            <td>{pde.pitched_walks}</td>
            <td>{pde.pitched_strikeouts_swinging}</td>
            <td>{pde.pitched_strikeouts_looking}</td>
            <td>{pde.pitched_strikeouts}</td>
        </tr>
    );
}

export default PitcherStatisticsRow