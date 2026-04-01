import { createClient } from '../utils/supabase/client';

const supabase = createClient();

export interface GlobalTimeSlot {
    id: string;
    label: string;
    sort_order: number;
}

export interface ToggleResult {
    action: 'added' | 'removed';
    id: string;
    slot: string | null;
    date: string;
}

export const availabilityService = {
    // ── Global Slots ──────────────────────────────────────────────────────────────
    async getGlobalSlots(): Promise<GlobalTimeSlot[]> {
        const { data, error } = await supabase
            .from('global_time_slots')
            .select('*')
            .order('sort_order', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    async addGlobalSlot(label: string, currentMaxOrder: number): Promise<GlobalTimeSlot> {
        // currentMaxOrder is passed from the client — no extra SELECT needed
        const { data, error } = await supabase
            .from('global_time_slots')
            .insert({ label: label.trim(), sort_order: currentMaxOrder + 1 })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteGlobalSlot(id: string): Promise<void> {
        const { error } = await supabase
            .from('global_time_slots')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // Single DB call via RPC instead of N individual UPDATEs
    async reorderGlobalSlots(orderedIds: string[]): Promise<void> {
        const { error } = await supabase.rpc('reorder_global_slots', {
            ordered_ids: orderedIds,
        });
        if (error) throw error;
    },

    // ── Per-date Overrides ────────────────────────────────────────────────────────
    async getOverrides(startDate: string, endDate: string) {
        const { data, error } = await supabase
            .from('availability_overrides')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate);

        if (error) throw error;
        return data;
    },

    // Single atomic DB call via RPC instead of SELECT + INSERT/DELETE
    async toggleSlot(date: string, slot: string | null): Promise<ToggleResult> {
        const { data, error } = await supabase.rpc('toggle_availability_slot', {
            p_date: date,
            p_slot: slot,
        });
        if (error) throw error;
        return data as ToggleResult;
    },
};
