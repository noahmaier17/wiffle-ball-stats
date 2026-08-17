import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { usePlayers } from '../contexts/PlayersContext';
import { playerName } from '../types';

type ToolCall = { name: string; args: unknown };
type Message = {
    role: 'user' | 'assistant';
    content: string;
    // Tools the AI ran to answer this message. Assistant messages only.
    toolCalls?: ToolCall[];
};

type ChatProps = { onBack: () => void };

export default function Chat({ onBack }: ChatProps) {
    const players = usePlayers();

    const [selectedRole, setSelectedRole] = useState<'spectator' | number>('spectator');
    const [chatStarted, setChatStarted] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || isThinking) return;

        const newMessages: Message[] = [...messages, { role: 'user', content: text }];
        setMessages(newMessages);
        setInput('');
        setIsThinking(true);
        setError(null);

        try {
            // Only the conversation and who is asking. The server owns the system prompt
            // and looks up stats itself through tools.
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: newMessages.map(m => ({ role: m.role, content: m.content })),
                    role: selectedRole,
                }),
            });
            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            const response = await res.json() as { text: string; toolCalls: ToolCall[] };

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: response.text,
                toolCalls: response.toolCalls,
            }]);
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

                <p>The AI knows the league rules and can look up any player's career stats on request.</p>

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
                <button onClick={() => setChatStarted(true)}>Start Chat</button>
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
            <p>The AI knows the league rules and can look up any player's career stats on request.</p>

            {messages.map((m, i) => (
                <div key={i}>
                    <strong>{m.role === 'user' ? roleLabel : 'Claude'}:</strong>
                    {window.debugLog && m.toolCalls && m.toolCalls.length > 0 && (
                        <p><small><em>
                            Looked up: {m.toolCalls.map(c => `${c.name}(${JSON.stringify(c.args)})`).join(', ')}
                        </em></small></p>
                    )}
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
