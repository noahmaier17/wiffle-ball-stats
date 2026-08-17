import { createClient } from '@supabase/supabase-js';

// The VITE_ prefix only controls what Vite inlines into the *client* bundle.
// Vercel exposes every env var to serverless functions, so process.env works here
// and we can reuse the same two variables the browser client uses.
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabasePublishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
