import { createClient } from '@/app/utils/supabase/client';

export interface CustomOption {
    id: string;
    type: 'size' | 'sponge' | 'cream' | 'decoration';
    label: string;
    sub_label?: string;
    image_url?: string;
    price: number;
    is_available: boolean;
    sort_order: number;
}

export const customCakeService = {
    async getOptions() {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('custom_cake_options')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) {
            console.error('Error fetching custom options:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            return [];
        }
        return data as CustomOption[];
    },

    async saveOption(option: Partial<CustomOption>) {
        const supabase = createClient();
        if (option.id) {
            const { data, error } = await supabase
                .from('custom_cake_options')
                .update(option)
                .eq('id', option.id)
                .select()
                .single();
            return { data, error };
        } else {
            const { data, error } = await supabase
                .from('custom_cake_options')
                .insert([option])
                .select()
                .single();
            return { data, error };
        }
    },

    async deleteOption(id: string) {
        const supabase = createClient();
        const { error } = await supabase
            .from('custom_cake_options')
            .delete()
            .eq('id', id);
        return { error };
    }
};
