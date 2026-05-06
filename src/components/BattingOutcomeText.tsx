import type { AtBatOutcomeSign } from "../types"

interface BatterOutcomeTextProps {
    batter: string,
    pitcher: string,
    rbis: number | undefined,
    outcomeSign: AtBatOutcomeSign | undefined
}

function BatterOutcomeText({ batter: _batter, pitcher: _pitcher, rbis: _rbis, outcomeSign: _outcomeSign }: BatterOutcomeTextProps) {
    return <></>
    // return (<h5>
    //     {batter} hit {rbis} RBIs on a {outcomeSign} play, pitched by {pitcher}.
    // </h5>)
}

export default BatterOutcomeText