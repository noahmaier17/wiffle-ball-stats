import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ChatAnthropic } from '@langchain/anthropic';
import { AIMessage, HumanMessage, SystemMessage, ToolMessage, type BaseMessage } from '@langchain/core/messages';
// Relative imports carry .js extensions because Vercel transpiles each file without
// bundling, and Node's ESM resolver rejects extensionless specifiers under "type": "module".
// TypeScript maps the .js back to the .ts source at compile time.
import { allTools, toolsByName } from './lib/tools.js';
import { loadLeagueData } from './lib/leagueData.js';
import { buildSystemPrompt } from './lib/systemPrompt.js';
import type { Player } from '../src/stats-core.js';

type ClientMessage = { role: 'user' | 'assistant'; content: string };

// Caps how many times the model may call tools before we stop asking it again.
// Each iteration is one round trip, so this bounds both latency and spend.
const MAX_TOOL_ITERATIONS = 6;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { messages, role } = req.body as {
            messages: ClientMessage[];
            role: 'spectator' | number;
        };

        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'Missing messages' });
        }

        const { players, games } = await loadLeagueData();

        // The client sends who it is, never the system prompt. Building the prompt here
        // means a caller cannot supply arbitrary instructions to our API key.
        const rolePlayer: 'spectator' | Player =
            role === 'spectator' || typeof role !== 'number'
                ? 'spectator'
                : players.find(p => p.id === role) ?? 'spectator';

        const model = new ChatAnthropic({
            model: 'claude-haiku-4-5',
            maxTokens: 1024,
        }).bindTools(allTools);

        const conversation: BaseMessage[] = [
            new SystemMessage(buildSystemPrompt(rolePlayer, games.length)),
            ...messages.map(m =>
                m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
            ),
        ];

        // Records every tool the model actually ran this turn, so the UI can show its work.
        const executed: { name: string; args: unknown }[] = [];
        let lastText = '';

        for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
            const aiMessage = await model.invoke(conversation);
            lastText = aiMessage.text;

            // No tool calls means the model is answering, so the loop is done.
            if (!aiMessage.tool_calls?.length) {
                return res.json({ text: lastText, toolCalls: executed });
            }

            // The assistant turn requesting the tools has to go into the history before
            // the results, and every requested call needs a matching ToolMessage before
            // the next invoke. The model can request several at once.
            conversation.push(aiMessage);

            for (const call of aiMessage.tool_calls) {
                executed.push({ name: call.name, args: call.args });

                let content: string;
                const selectedTool = toolsByName[call.name];
                if (!selectedTool) {
                    content = `Unknown tool: ${call.name}`;
                } else {
                    try {
                        content = String(await selectedTool.invoke(call.args));
                    } catch (err) {
                        // Hand the failure back to the model rather than killing the turn;
                        // it can explain the problem or try a different approach.
                        content = `Tool ${call.name} failed: ${err instanceof Error ? err.message : 'unknown error'}`;
                    }
                }

                conversation.push(new ToolMessage({
                    tool_call_id: call.id ?? call.name,
                    name: call.name,
                    content,
                }));
            }
        }

        // Ran out of iterations while the model was still calling tools.
        return res.json({
            text: lastText || 'I had trouble looking that up. Try asking a more specific question.',
            toolCalls: executed,
        });
    } catch (err) {
        console.error('[api/chat]', err);
        return res.status(500).json({ error: 'Something went wrong handling that message.' });
    }
}
