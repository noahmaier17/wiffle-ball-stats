import { calculateERA, calculateWHIP, playerNameShort, type Player, type PlayerGameData, type statViewTypes } from "../../types";

type PitcherStatisticsRowProps = {
    viewType: statViewTypes;
    pde: PlayerGameData;
    player?: Player;
};

function PitcherStatisticsRow({ viewType, pde, player }: PitcherStatisticsRowProps) {
    const displayInningsPitched = () => {
        return (viewType === 'by_game')
            ? ((pde.games_pitched === 0) ? 0 : ((pde.pitched_outs / pde.games_pitched) / 3).toFixed(2))
            : (pde.innings_pitched).toFixed(1)
    }

    const display = (value: number) => {
        return (viewType === 'by_game')
            ? ((pde.games_pitched === 0) ? 0 : (value / pde.games_pitched).toFixed(2))
            : value
    }

    return (
        <tr>
            {player && <td>{playerNameShort(player)}</td>}
            <td>{pde.games_pitched}</td>
            <td>{displayInningsPitched()}</td>
            {/* <td>{displayInningsPitched(pde.innings_pitched).toFixed(1)}</td> */}
            <td>{display(pde.hits_allowed)}</td>
            <td>{display(pde.runs_allowed)}</td>
            <td>{display(pde.pitched_walks)}</td>
            <td>{display(pde.pitched_strikeouts_swinging)}</td>
            <td>{display(pde.pitched_strikeouts_looking)}</td>
            <td>{display(pde.pitched_strikeouts)}</td>
            <td>{calculateERA(pde).toFixed(2)}</td>
            <td>{calculateWHIP(pde).toFixed(2)}</td>
        </tr>
    );
}

export default PitcherStatisticsRow