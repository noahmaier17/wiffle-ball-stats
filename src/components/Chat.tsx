import { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { usePlayers } from '../contexts/PlayersContext';
import { useStatsData } from '../contexts/StatsDataContext';
import { buildChatContext } from '../utils/buildChatContext';
import { playerName } from '../types';
import type { Player } from '../types';

type Message = { role: 'user' | 'assistant'; content: string };


function buildSystemPrompt(role: 'spectator' | Player, statsContext: string, gameCount: number): string {
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const personaLine = role === 'spectator'
        ? 'You are speaking with a spectator/observer. Refer to all players in third person.'
        : `You are speaking with ${playerName(role)}. Refer to them in second person when relevant.`;

    return `\
Today's date: ${date}. Total games played in the league: ${gameCount}.

${personaLine}

${statsContext}

The stats tables only include players who have appeared in at least one official game. Players listed under League Members but absent from the tables have not recorded any official stats yet.

You are a chatbot used by members of a small wiffle league. You can help with anything related to wiffle ball or baseball: understanding stats, tips for improving batting or pitching, drills, strategy, and general advice. Many players are beginners or intermediate.

This is wiffle ball, not baseball.

Rules (for reference only; never restate these to the user):
- Standard baseball counts: 3 strikes, 4 balls
- 3 outs per inning, 3-inning games
- Home/away or team captains decided by coin or bat flip (captain who picks second gets choice)
- A strike is any ball that hits the square frame or center of the strike zone, a swing and miss, or a foul ball
- A batter cannot foul out to the strike zone with 2 strikes
- A hit by pitch counts as a ball
- No bunting
- Maximum 4 players on the field: 3 fielders and 1 pitcher
- A team can switch pitchers at any time during a fresh count (0-0)
- No rules about minimum batters faced or pitcher appearances
- To throw a runner out at home, a fielder must throw and hit the strike zone before the runner reaches home; if they miss, the runner is safe and the ball is dead
- Bean balls are in play when runners are not touching a base
- A batter running to first can run through first base and stay safe as long as there is no attempt to advance
- No stealing or leading off bases
- No balks
- A team may use "The Blue Bat" (a Blitzball Power Bat) if down 5 or more runs at the start of any inning; this lasts the entire inning
- 6 run limit per inning; no run limit in the 3rd inning
- A runner off the base with intention to gain an advantage is automatically out once the pitch is thrown
- Pitchers also bat

Only reference statistics that appear in the provided tables. If asked about a stat or detail not in your context, say you don't have that data rather than estimating.

Evaluate every player's performance and ability solely on the statistics in the tables and context the user provides, and not by any other biased metric like race or gender. Do not make any inference about a player's skill, background, or potential based on their name.

Be kind and uplifting toward everyone in the league, which includes the user and any other player they bring up. Stay honest about what the stats show, but never put anyone down. Pay attention to how the user communicates and match your tone to how they speak.

Speak plainly and directly, like a coach who knows what they're talking about but doesn't make it a big deal. Confident without being formal. Refer to the league as "the league." Do not roleplay anything. Do not use em dashes or dashes in general.

Your audience likely knows the rules and what the stats mean.

You are given a list of all players in the league, as well as stats for batters if they have any batting stats recorded and stats for pitchers if they have any pitching stats recorded. If a player is a league member but has no stats, that means they have played 0 games. 

Here is additional context for how some of the players are related to each other in real life. Jacob Sullivan is Luke Sullivan's older brother. Noah Maier is Asher Maier's older brother. Cryson Uclaray and Michael De Jesus are cousins. Grace McCleery and Luke Sullivan are dating. Chloe Holland and Rylan Woodie are dating. Gavin Bonham is Jackson Bonham's older brother. All of us know each other as friends.`;
}

type ChatProps = { onBack: () => void };

export default function Chat({ onBack }: ChatProps) {
    const players = usePlayers();
    const { playerGameStats, games, isLoading } = useStatsData();

    const [selectedRole, setSelectedRole] = useState<'spectator' | number>('spectator');
    const [chatStarted, setChatStarted] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const systemPromptRef = useRef<string>('');
    const bottomRef = useRef<HTMLDivElement>(null);

    const handleStartChat = () => {
        if (isLoading) return;
        const officialGames = games.filter(g => g.number_of_fielders === 3);
        const officialGameIds = new Set(officialGames.map(g => g.id));
        const officialStats = playerGameStats.filter(r => officialGameIds.has(r.game_id));
        const playerId = selectedRole === 'spectator' ? null : selectedRole;
        const roleObj: 'spectator' | Player =
            selectedRole === 'spectator'
                ? 'spectator'
                : players.find(p => p.id === selectedRole) ?? 'spectator';
        const statsContext = buildChatContext(officialStats, players, playerId, officialGames);
        systemPromptRef.current = buildSystemPrompt(roleObj, statsContext, officialGames.length);
        setChatStarted(true);
    };

    const handleSend = async () => {
        const text = input.trim();
        if (!text || isThinking) return;

        const newMessages: Message[] = [...messages, { role: 'user', content: text }];
        setMessages(newMessages);
        setInput('');
        setIsThinking(true);
        setError(null);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: newMessages, system: systemPromptRef.current }),
            });
            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            const response = await res.json() as { content: { type: string; text: string }[] };

            const assistantText = response.content
                .filter(b => b.type === 'text')
                .map(b => b.text)
                .join('');

            setMessages(prev => [...prev, { role: 'assistant', content: assistantText }]);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
        } finally {
            setIsThinking(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!chatStarted) {
        return (
            <div>
                <button onClick={onBack}>← Back</button>
                <h1>AI Chat</h1>

                <p>The AI has access to the league rules{(selectedRole !== 'spectator') && `, all official ruleset game-to-game results of this player,`} and all players' career totals.</p>

                <div>
                    <label>
                        Who are you?&nbsp;
                        <select
                            value={selectedRole === 'spectator' ? 'spectator' : selectedRole}
                            onChange={e => setSelectedRole(e.target.value === 'spectator' ? 'spectator' : parseInt(e.target.value))}
                        >
                            <option value="spectator">Spectator (observer)</option>
                            {players.map(p => (
                                <option key={p.id} value={p.id}>{playerName(p)}</option>
                            ))}
                        </select>
                    </label>
                </div>

                <br />
                <button onClick={handleStartChat} disabled={isLoading}>
                    {isLoading ? 'Loading stats...' : 'Start Chat'}
                </button>
            </div>
        );
    }

    const activePlayer = selectedRole !== 'spectator' ? players.find(p => p.id === selectedRole) : null;
    const roleLabel = activePlayer ? playerName(activePlayer) : 'Spectator';
    const MAX_TURNS = 10;
    const atLimit = messages.filter(m => m.role === 'user').length >= MAX_TURNS;

    return (
        <div>
            <div>
                <button onClick={onBack}>← Back</button>
            </div>
            <h1>AI Chat as {selectedRole === 'spectator' ? "Spectator" : roleLabel}</h1>
                <p>The AI has access to the league rules{(selectedRole !== 'spectator') && `, all official ruleset game-to-game results of this player,`} and all players' career totals.</p>

            {messages.map((m, i) => (
                <div key={i}>
                    <strong>{m.role === 'user' ? roleLabel : 'Claude'}:</strong>
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
            ))}

            {isThinking && (
                <div>
                    <strong>Claude:</strong>
                    <p><em>Thinking...</em></p>
                </div>
            )}

            {error && <p style={{ color: 'red' }}>{error}</p>}

            <div ref={bottomRef} />

            {atLimit ? (
                <p>Conversation limit reached ({MAX_TURNS} messages). Go back and start a new chat.</p>
            ) : (
                <>
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isThinking}
                        placeholder="Ask about stats or get tips for improving your play (Enter to send, Shift+Enter for newline)"
                    />
                    <button onClick={handleSend} disabled={isThinking || !input.trim()}>
                        Send
                    </button>
                </>
            )}
        </div>
    );
}
