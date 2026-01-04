import { createClient } from '@/app/utils/supabase/client';
import { UserProfile } from '@/app/types';

export const profileService = {
    async getProfile(userId: string): Promise<UserProfile | null> {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return null;
        }

        return data;
    },

    async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<{ error: any }> {
        const supabase = createClient();

        // 1. Update Auth Metadata (if full_name or avatar_url provided)
        const authUpdates: any = {};
        if (updates.full_name) authUpdates.full_name = updates.full_name;
        if (updates.avatar_url) authUpdates.avatar_url = updates.avatar_url;

        if (Object.keys(authUpdates).length > 0) {
            const { error: authError } = await supabase.auth.updateUser({
                data: authUpdates
            });
            if (authError) return { error: authError };
        }

        // 2. Update Database Profile
        const { error: dbError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId);

        return { error: dbError };
    }
};
