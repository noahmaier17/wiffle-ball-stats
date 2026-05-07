import { useEffect, useState } from "react";
import { supabase } from "../supabase-client";
import { playerName, type Player, type PlayerDatabaseSchema } from "../types";

type PlayerStatisticsProps = {
    user: Player;
    onBack: () => void;
};

function PlayerStatistics({ user, onBack }: PlayerStatisticsProps) {
    const [stats, setStats] = useState<PlayerDatabaseSchema[] | null>(null);

    useEffect(() => {
        supabase
            .from('player_game_stats')
            .select('*')
            .eq('player_id', user.id)
            .then(({ data, error }) => {
                if (error) console.log(error.message);
                else setStats(data);
            });
    }, []);

    if (!stats) return null;

    const sum = (key: keyof PlayerDatabaseSchema) =>
        stats.reduce((acc, curr) => acc + (curr[key] as number), 0);

    const plateAppearances = sum('plate_appearances');
    const atBats = sum('at_bats');
    const hits = sum('hits');
    const singles = sum('singles');
    const doubles = sum('doubles');
    const triples = sum('triples');
    const homeRuns = sum('home_runs');
    const rbis = sum('runs_batted_in');
    const walks = sum('walks');
    const strikeouts = sum('strikeouts');

    const pitchedOuts = sum('pitched_outs');
    const inningsPitched = Math.floor(pitchedOuts / 3) + (pitchedOuts % 3) / 10;
    const pitchedStrikeouts = sum('pitched_strikeouts');
    const pitchedWalks = sum('pitched_walks');
    const hitsAllowed = sum('hits_allowed');
    const runsAllowed = sum('runs_allowed');

    return (
        <div>
            <button onClick={onBack}>← Back</button>
            <h1>{playerName(user)} Statistics</h1>
            <h3>Batting</h3>
            <table>
                <thead>
                    <tr>
                        <th>PA</th><th>AB</th><th>H</th><th>1B</th><th>2B</th>
                        <th>3B</th><th>HR</th><th>RBI</th><th>BB</th><th>K</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>{plateAppearances}</td>
                        <td>{atBats}</td>
                        <td>{hits}</td>
                        <td>{singles}</td>
                        <td>{doubles}</td>
                        <td>{triples}</td>
                        <td>{homeRuns}</td>
                        <td>{rbis}</td>
                        <td>{walks}</td>
                        <td>{strikeouts}</td>
                    </tr>
                </tbody>
            </table>

            <h3>Pitching</h3>
            <table>
                <thead>
                    <tr>
                        <th>IP</th><th>K</th><th>BB</th><th>H</th><th>R</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>{inningsPitched.toFixed(1)}</td>
                        <td>{pitchedStrikeouts}</td>
                        <td>{pitchedWalks}</td>
                        <td>{hitsAllowed}</td>
                        <td>{runsAllowed}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

export default PlayerStatistics