import { createClient } from '../utils/supabase/client';

const supabase = createClient();

export const availabilityService = {
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
            // Use maybeSingle to avoid errors if record doesn't exist
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
                // Remove override to make it "uncrossed" (default available)
                const { error } = await supabase
                    .from('availability_overrides')
                    .delete()
                    .eq('id', existing.id);
                if (error) throw error;
                return { action: 'removed' };
            } else {
                // Add override to make it "crossed" (not available)
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
