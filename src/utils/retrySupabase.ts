import { supabase } from "../supabase-client";

const RETRY_DELAYS = [500, 1000, 2000, 4000, 8000, 10000, 10000, 10000, 10000];

// TEST ONLY — set window.__retryTestFailures = N in the browser console to force N failures before succeeding
declare global { interface Window { __retryTestFailures?: number } }

export async function retrySupabase<T>(
    fn: () => PromiseLike<{ data: T | null; error: any }>,
    queryType: string
): Promise<{ data: T | null; error: any }> {
    let lastResult: { data: T | null; error: any } = { data: null, error: null };
    for (let attempt = 1; attempt <= 10; attempt++) {

        // Allows for testing of retry failures
        if (window.__retryTestFailures && window.__retryTestFailures > 0) {
            window.__retryTestFailures--;
            lastResult = { data: null, error: new Error('Simulated network error') };

        } else {
            lastResult = await fn();
        }

        // If we have no error, returns our data
        if (!lastResult.error) return lastResult;

        // Otherwise, we log an error, and wait for a given number of seconds
        console.error(`Attempt ${attempt}/10 failed for ${queryType}:`, lastResult.error);
        if (attempt < 10) {
            await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt - 1]));
        }
    }

    return lastResult;
}

export async function retryInsert(table: string, data: object): Promise<boolean> {
    const { error } = await retrySupabase(
        () => supabase.from(table).insert(data),
        table
    );
    return !error;
}
