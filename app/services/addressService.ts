import { createClient } from '@/app/utils/supabase/client';
import { UserAddress } from '@/app/types';

export const addressService = {
    async getUserAddresses(): Promise<UserAddress[]> {
        const supabase = createClient();
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return [];

            const { data, error } = await supabase
                .from('addresses')
                .select('*')
                .order('is_default', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching addresses (DB Error):', error.message, '| Code:', error.code);
                return [];
            }

            return data || [];
        } catch (err: any) {
            console.error('Error fetching addresses (Runtime):', err.message || err);
            return [];
        }
    },

    async addAddress(address: Omit<UserAddress, 'id' | 'user_id'>): Promise<{ data: any; error: any }> {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { data: null, error: new Error('User not authenticated') };

        const { data, error } = await supabase
            .from('addresses')
            .insert([{ ...address, user_id: user.id }])
            .select()
            .single();

        return { data, error };
    },

    async updateAddress(id: string, updates: Partial<UserAddress>): Promise<{ data: any; error: any }> {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('addresses')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        return { data, error };
    },

    async deleteAddress(id: string): Promise<{ error: any }> {
        const supabase = createClient();
        const { error } = await supabase
            .from('addresses')
            .delete()
            .eq('id', id);

        return { error };
    },

    async setDefaultAddress(id: string): Promise<{ error: any }> {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { error: new Error('User not authenticated') };

        // 1. Unset all defaults for this user
        await supabase
            .from('addresses')
            .update({ is_default: false })
            .eq('user_id', user.id);

        // 2. Set new default
        const { error } = await supabase
            .from('addresses')
            .update({ is_default: true })
            .eq('id', id);

        return { error };
    }
};
