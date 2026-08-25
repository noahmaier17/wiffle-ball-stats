import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

// Created on first use rather than at import time. A module-scope throw crashes the function
// before the handler's try/catch exists, which turns a missing variable into an opaque 500
// with nothing useful logged. Failing here instead means the error is caught and reported.
//
// The VITE_ prefix only controls what Vite inlines into the client bundle. Vercel exposes
// every env var to serverless functions, so these are the same two the browser client uses.
export function getSupabase(): SupabaseClient {
    if (client) return client;

    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
        const missing = [
            !url && 'VITE_SUPABASE_URL',
            !key && 'VITE_SUPABASE_PUBLISHABLE_KEY',
        ].filter(Boolean).join(' and ');
        throw new Error(
            `Missing ${missing} in the serverless runtime. Set it for the Production ` +
            `environment in the Vercel project settings and redeploy.`
        );
    }

    client = createClient(url, key);
    return client;
}
