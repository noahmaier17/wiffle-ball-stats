import { type GameData, ordinalNumber, playerName, type Player } from "../types"

type JumbotronProps = {
    gameData: GameData;
}

function Jumbotron({ gameData }: JumbotronProps) {
    const {
        awayTeamBatting, awayPitcher, homePitcher, inning,
        awayTeamLineup, homeTeamLineup,
        awayAlltimeDefensePlayers, homeAlltimeDefensePlayers,
        awayRuns, homeRuns, numberOfOuts, numberOnBase,
        currAwayTeamBatter, currHomeTeamBatter,
    } = gameData;

    const currentPitcher = awayTeamBatting ? homePitcher : awayPitcher;

    const renderTeam = (
        label: string, isBatting: boolean,
        lineup: Player[], currIdx: number, defensePlayers: Player[]
    ) => (
        <div>
            <h4 style={{ margin: '0 0 0.25em' }}>{label} ({isBatting ? 'Batting' : 'Fielding'})</h4>
            <div>
                <span>Next at bat: {playerName(lineup[currIdx % lineup.length])} | </span>
                <span>Next on deck: {playerName(lineup[(currIdx + 1) % lineup.length])} | </span>
                <span>Next in hole: {playerName(lineup[(currIdx + 2) % lineup.length])}</span>
            </div>
            <div>
                <strong>Order:</strong>{' '}
                {lineup.map(playerName).join(', ')}
            </div>
            {defensePlayers.length > 0 && (
                <div>
                    <strong>Defense only:</strong>{' '}
                    {defensePlayers.map(playerName).join(', ')}
                </div>
            )}
        </div>
    );

    return <div style={{ paddingBottom: '1rem' }}>
        <h3>
            <span>{awayTeamBatting ? "Top" : "Bottom"} {ordinalNumber(inning)} Inning with </span>
            <span>{numberOnBase} on Base and </span>
            <span>{numberOfOuts ? numberOfOuts : "No"} Out{numberOfOuts === 1 ? "" : "s"}; {awayRuns} - {homeRuns}</span>
        </h3>
        <div style={{ marginTop: '0.75em' }}>
            {renderTeam('Away', awayTeamBatting, awayTeamLineup, currAwayTeamBatter, awayAlltimeDefensePlayers)}
            <div style={{ marginTop: '0.75em' }}>
                {renderTeam('Home', !awayTeamBatting, homeTeamLineup, currHomeTeamBatter, homeAlltimeDefensePlayers)}
            </div>
        </div>
        <div style={{ marginTop: '0.75em' }}>On the mound: {currentPitcher ? playerName(currentPitcher) : 'None'}</div>
    </div>;
}

export default Jumbotron