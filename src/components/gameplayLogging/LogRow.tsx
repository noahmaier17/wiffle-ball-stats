import { outcomeSignToJSXElement, playerNameShort, type AtBatLog } from "../../types"

type LogRowProps = {
    atBat: AtBatLog
}

function LogRow({ atBat }: LogRowProps) {
    return (<>
        <span>{playerNameShort(atBat.batter)}: {outcomeSignToJSXElement(atBat.outcomeSign)}</span>
        <span>{(atBat.rbis > 0) ? ", " + atBat.rbis + " RBI" : ""}</span>
        <span>{(atBat.extraComments !== "" ? "; " : "")}</span>
        {atBat.recordedOuts > 0 && <span>{" (" + atBat.recordedOuts + " out" + (atBat.recordedOuts > 1 ? "s" : "") + ") "}</span>}
        <em>{atBat.extraComments}</em>
    </>);
}

export default LogRow