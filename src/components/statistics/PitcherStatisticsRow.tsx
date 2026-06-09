import { calculateERA, calculateWHIP, playerNameShort, type Player, type PlayerGameData, type statViewTypes } from "../../types";

type PitcherStatisticsRowProps = {
    viewType: statViewTypes;
    pde: PlayerGameData;
    player?: Player;
    index?: number;
};

function PitcherStatisticsRow({ viewType, pde, player, index }: PitcherStatisticsRowProps) {
    const displayInningsPitched = () => {
        return (viewType === 'by_game')
            ? ((pde.games_pitched === 0) ? '--' : ((pde.pitched_outs / pde.games_pitched) / 3).toFixed(2))
            : (viewType === 'by_PA_and_BF')
                ? ((pde.batters_faced === 0) ? '--' : ((pde.pitched_outs / pde.batters_faced) / 3).toFixed(3))
                : (pde.innings_pitched).toFixed(1)
    }

    const display = (value: number, { isBattersFaced = false }: { isBattersFaced?: boolean } = {}) => {
        return (viewType === 'by_game')
            ? ((pde.games_pitched === 0) ? '--' : (value / pde.games_pitched).toFixed(2))
            : (viewType === 'by_AB_and_IP')
                ? ((pde.pitched_outs === 0) ? '--' : (3 * value / pde.pitched_outs).toFixed(3))
                : (viewType === 'by_PA_and_BF' && !isBattersFaced)
                    ? ((pde.batters_faced === 0) ? '--' : (value / pde.batters_faced).toFixed(3))
                    : value

    }

    return (
        <tr>
            {player && <td>{index !== undefined && `${index + 1}: `}{playerNameShort(player)}</td>}
            <td>{pde.games_pitched}</td>
            <td>{displayInningsPitched()}</td>
            <td>{display(pde.batters_faced, { isBattersFaced: true })}</td>
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