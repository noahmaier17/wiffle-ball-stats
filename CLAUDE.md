## Supabase Schema

### Table: `player_game_stats`

Shows the batting and pitching statistics for every individual player who played in a game with this `game_id` value. 

| Column | Type | Notes |
|--------|------|-------|
| id | int8 | Primary key |
| player_id | int8 | Foreign key; the player |
| game_id | int8 | Foreign key; the game number |
| at_bats | int2 | Number of at bats |
| doubles | int2 | Number of doubles |
| triples | int2 | Number of triples |
| home_runs | int2 | Number of home runs; also counts inside the park home runs |
| runs_batted_in | int2 | Number of RBIs |
| walks | int2 | Number of walks as the batter |
| strikeouts | int2 | Number of strikeouts; counts strikeouts looking and strikeouts swinging |
| runs_allowed | int2 | Number of runs allowed |
| innings_pitched | int2 | Number of innings pitched; displayed in the style of baseball IP statistics, where 1 pitched out means 0.1 IP |
| pitched_strikeouts | int2 | Number of pitched strikeouts; counts pitched strikeouts swinging and pitched strikeouts looking |
| pitched_walks | int2 | Number of pitched walks |
| hits_allowed | int2 | Number of hits allowed as the pitcher |
| hits | int2 | Number of hits as the batter |
| singles  | int2 | Number of singles |
| pitched_outs | int2 | Number of outs that occured while pitching; used to calculate innings pitched |
| plate_appearances | int2 | Number of plate appearances |
| inside_the_park_home_runs | int2 | Number of IPHR |
| strikeouts_looking | int2 | Number of strikeouts looking |
| strikeouts_swinging | int2 | Number of strikeouts swinging |
| games_pitched | int2 | 1 if this player pitched this game, 0 otherwise |
| games_played | int2 | 1 if this player played this game; since only players that played in this game appear in this dataset, this column always equals 1 |
| win | int2 | 1 if the player was on the winning team, 0 otherwise |
| loss | int2 | 1 if the player was on the loosing team, 0 otherwise |
| home_runs_allowed | int2 | Number of HR allowed as the pitcher |
| time | timestamptz | Automatic timestamp value |
| fielders_choice | int2 | Number of plays as the batter that resulted in FC; was not tracked until the 4th game |

### Table: `game_logs`

Logs each event that happens throughout a game. Corresponds to specific types of game logs: `additional_information_log`, `edit_gamestate_log`, `at_bat_logs`, `inning_switch_logs`, and `pitching_change_logs`.

| Column | Type | Notes |
|--------|------|-------|
| id | int8 | Primary key |
| game_id | int4 | Foreign key; the game number |
| sequence | int4 | The position of this game log with respect to other game logs with this game_id |
| type | text | The type of log: `additional_information_log`, `edit_gamestate_log`, `at_bat_logs`, `inning_switch_logs`, or `pitching_change_logs`. |
| created_at | timestamptz | Automatic timestamp value |

### Table: `pitching_change_logs`

Logs when a pitcher is subbed out for another pitcher.

| Column | Type | Notes |
|--------|------|-------|
| log_id | int8 | Foreign key; connected to `id` of `game_logs` |
| team_changing | text | If the `home` or `away` team is having this pitching change |
| old_pitcher_id | int4 | The former pitcher id |
| new_pitcher_id | int4 | The new pitcher id |

### Table: `inning_switch_logs`

Logs when switching sides. Badly named log type, since we are switching sides and not always innings.

| Column | Type | Notes |
|--------|------|-------|
| log_id | int8 | Foreign key; connected to `id` of `game_logs` |

### Table: `at_bat_logs`

Logs what happened during a given at bat.
The `flagged_*_row` logs mean that the row has some sort of error such that it should be ignored in cases like tracking stats. The reason to have such a column is we still need all of these logs to recreate games, but we might want to ignore this row due to some sort of error. 
As of writing this, the only instance these flags are used is `flagged_pitcher_row` for the first 3 games, since ERA and pitching changes were logged extremely poorly.

| Column | Type | Notes |
|--------|------|-------|
| log_id | int8 | Foreign key; connected to `id` of `game_logs` |
| batter_id | int4 | Foreign key; the batter player id, connected to `id` of `players` |
| pitcher_id | int4 | Foreign key; the batter player id, connected to `id` of `players` |
| outcome_sign | text | The outcome of the at bat, includes the likes of `1B`, `2B`, `K`, `reverse-K`, etc. |
| rbis | int4 | Number of RBIs as a result of this at bat |
| recorded_outs | int4 | Number of outs as a result of this at bat |
| inning | int4 | What inning it is |
| extra_comments | int4 | Additional comments appended to this at bat; often an empty string |
| flagged_batter_row | bool | `True` if this log is problematically logged for the batter |
| flagged_pitcher_row | bool | `True` if this log is problematically logged for the pitcher |


### Table: `edit_gamestate_logs`

Logs when the gamestate is edited for whatever reason. Most often, gamestate is edited do to some logging error that needs real-time correction. 

| Column | Type | Notes |
|--------|------|-------|
| log_id | int8 | Foreign key; connected to `id` of `game_logs` |
| info | text | Descriptor of why the game state was edited |
| new_game_data | jsonb | 