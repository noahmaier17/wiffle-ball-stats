import { supabase } from "../supabase-client";
import type { Park } from "../types";

export default async function fetchGameIdsByPark(selectedParks: Set<Park>): Promise<number[] | null> {
    const { data, error } = await supabase
        .from('games')
        .select('id')
        .in('field', Array.from(selectedParks));
    if (error) return null;
    return data.map(r => r.id);
}