import { outcomeSignToJSXElement, playerNameShort, type AtBatLog } from "../../types"

type LogRowProps = {
    atBat: AtBatLog,
    showOpponent?: boolean,
}

function LogRow({ atBat, showOpponent }: LogRowProps) {
    return (<>
        <span>{playerNameShort(atBat.batter)}{showOpponent ? ` facing ${playerNameShort(atBat.pitcher)}` : ''}: {outcomeSignToJSXElement(atBat.outcomeSign)}</span>
        <span>{(atBat.rbis > 0) ? ", " + atBat.rbis + " RBI" : ""}</span>
        {atBat.recordedOuts > 0 && <span>{" (" + atBat.recordedOuts + " out" + (atBat.recordedOuts > 1 ? "s" : "") + ")"}</span>}
        <span>{(atBat.extraComments !== "" ? "; " : "")}</span>
        <em>{atBat.extraComments}</em>
    </>);
}

export default LogRow