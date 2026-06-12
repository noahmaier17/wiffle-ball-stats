import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { messages, system } = req.body as {
        messages: { role: 'user' | 'assistant'; content: string }[];
        system: string;
    };

    if (!messages || !system) {
        return res.status(400).json({ error: 'Missing messages or system' });
    }

    const response = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        system,
        messages,
    });

    return res.json(response);
}
