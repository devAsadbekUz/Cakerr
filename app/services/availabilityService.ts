import { createClient } from '../utils/supabase/client';

const supabase = createClient();

export interface GlobalTimeSlot {
    id: string;
    label: string;
    sort_order: number;
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

    async addGlobalSlot(label: string): Promise<GlobalTimeSlot> {
        // Get max sort_order so new slot appends at the bottom
        const { data: existing } = await supabase
            .from('global_time_slots')
            .select('sort_order')
            .order('sort_order', { ascending: false })
            .limit(1);

        const maxOrder = existing?.[0]?.sort_order ?? 0;

        const { data, error } = await supabase
            .from('global_time_slots')
            .insert({ label: label.trim(), sort_order: maxOrder + 1 })
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

    async reorderGlobalSlots(orderedIds: string[]): Promise<void> {
        // Update sort_order for each slot based on new index
        const updates = orderedIds.map((id, index) =>
            supabase
                .from('global_time_slots')
                .update({ sort_order: index + 1 })
                .eq('id', id)
        );
        await Promise.all(updates);
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

    async toggleSlot(date: string, slot: string | null) {
        try {
            const query = supabase
                .from('availability_overrides')
                .select('*')
                .eq('date', date);

            if (slot === null) {
                query.is('slot', null);
            } else {
                query.eq('slot', slot);
            }

            const { data: existing, error: fetchError } = await query.maybeSingle();

            if (fetchError) throw fetchError;

            if (existing) {
                const { error } = await supabase
                    .from('availability_overrides')
                    .delete()
                    .eq('id', existing.id);
                if (error) throw error;
                return { action: 'removed' };
            } else {
                const { error } = await supabase
                    .from('availability_overrides')
                    .insert({ date, slot, is_available: false });
                if (error) throw error;
                return { action: 'added' };
            }
        } catch (error) {
            console.error('Error in toggleSlot:', error);
            throw error;
        }
    }
};
