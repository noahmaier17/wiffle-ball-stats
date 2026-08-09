import { type GameData, ordinalNumber, playerName, type Player } from "../types"
import { PARK_DISPLAY_NAMES } from "../constants"

type JumbotronProps = {
    gameData: GameData;
    gameLogging?: boolean;
}

function Jumbotron({ gameData, gameLogging = false }: JumbotronProps) {
    const {
        field,
        awayTeamBatting, awayPitcher, homePitcher, inning,
        awayTeamLineup, homeTeamLineup,
        awayAlltimeDefensePlayers, homeAlltimeDefensePlayers,
        awayRuns, homeRuns, numberOfOuts, numberOnBase,
        currAwayTeamBatter, currHomeTeamBatter,
    } = gameData;

    const currentPitcher = awayTeamBatting ? homePitcher : awayPitcher;

    const positionText = (text: string, isBatting: boolean) => {
        return (isBatting)
            ? text.charAt(0).toUpperCase() + text.slice(1)
            : "Next " + text;
    }

    const renderTeam = (
        label: string, 
        isBatting: boolean,
        lineup: Player[], 
        currIdx: number, 
        defensePlayers: Player[]
    ) => (
        <div>
            <h4 style={{ margin: '0 0 0.25em' }}>{label} ({isBatting ? 'Batting' : 'Fielding/Pitching'})</h4>
            <div>
                <span>{positionText("at bat:", isBatting)} {playerName(lineup[currIdx % lineup.length])} | </span>
                <span>{positionText("on deck:", isBatting)} {playerName(lineup[(currIdx + 1) % lineup.length])} | </span>
                <span>{positionText("in hole:", isBatting)} {playerName(lineup[(currIdx + 2) % lineup.length])}</span>
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

    const gameState = () => (
        <h3>
            <span>{awayRuns} - {homeRuns}, </span>
            {field && <span>{PARK_DISPLAY_NAMES[field] ?? field} — </span>}
            <span>{awayTeamBatting ? "Top" : "Bottom"} {ordinalNumber(inning)}, </span>
            <span>{numberOnBase} on Base, </span>
            <span>{numberOfOuts} Out{numberOfOuts === 1 ? "" : "s"}</span>
        </h3>
    );

    return <div style={{ paddingBottom: '1rem' }}>
        {!gameLogging && gameState()}
        <div style={{ marginTop: '0.75em' }}>
            {renderTeam('Away', awayTeamBatting, awayTeamLineup, currAwayTeamBatter, awayAlltimeDefensePlayers)}
            <div style={{ marginTop: '0.75em' }}>
                {renderTeam('Home', !awayTeamBatting, homeTeamLineup, currHomeTeamBatter, homeAlltimeDefensePlayers)}
            </div>
        </div>
        <div style={{ marginTop: '0.75em' }}>On the mound: {currentPitcher ? playerName(currentPitcher) : 'None'}</div>
        {gameLogging && gameState()}
    </div>;
}

export default Jumbotron