import type { AtBatOutcomeSign } from "../types"

interface BatterOutcomeTextProps {
    batter: string,
    pitcher: string,
    rbis: number,
    outcomeSign: AtBatOutcomeSign
}

function BatterOutcomeText({ batter, pitcher, rbis, outcomeSign }: BatterOutcomeTextProps) {
    return (<h5>
        {batter} hit {rbis} RBIs on a {outcomeSign} play, pitched by {pitcher}.
    </h5>)
}

export default BatterOutcomeText