import { currAtBat, currInHole, currOnDeck, type GameData, ordinalNumber, playerName } from "../types"

type JumbotronProps = {
    gameData: GameData;
}

function Jumbotron({ gameData }: JumbotronProps) {
    const {
        awayTeamBatting,
        awayPitcher,
        homePitcher,
        inning,
        awayTeamLineup,
        homeTeamLineup,
        awayRuns,
        homeRuns,
        numberOfOuts
    } = gameData;

    return <div style={{ paddingBottom: '1rem' }}>
        <h3>
            {awayTeamBatting ? "Top" : "Bottom"} {ordinalNumber(inning)} Inning with {numberOfOuts ? numberOfOuts : "No"} Out{numberOfOuts === 1 ? "" : "s"}; {awayRuns} - {homeRuns}
        </h3>
        <h4>
            {awayTeamLineup.map(playerName).join(', ')}
            {" VERSUS "}
            {homeTeamLineup.map(playerName).join(', ')}
        </h4>
        <div>
            <span>At bat: {playerName(currAtBat(gameData))} | </span>
            <span>On deck: {playerName(currOnDeck(gameData))} | </span>
            <span>In hole: {playerName(currInHole(gameData))}</span>
        </div>
        <div>
            On the mound: {playerName(awayTeamBatting ? homePitcher : awayPitcher)}
        </div>
    </div>
}

export default Jumbotron