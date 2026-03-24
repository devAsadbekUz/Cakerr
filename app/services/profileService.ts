import { UserProfile } from '@/app/types';
import { getAuthHeader } from '@/app/utils/telegram';

export const profileService = {
    async getProfile(userId?: string): Promise<UserProfile | null> {
        try {
            // Use /api/user/me to get the verified profile (most secure for current user)
            const response = await fetch('/api/user/me', {
                headers: getAuthHeader(),
                credentials: 'include'
            });

            if (!response.ok) {
                console.error('[ProfileService] Error fetching profile:', response.status);
                return null;
            }

            const data = await response.json();
            return data.user || null;
        } catch (err) {
            console.error('[ProfileService] getProfile Runtime Error:', err);
            return null;
        }
    },

    async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<{ data?: UserProfile; error: any }> {
        try {
            const response = await fetch('/api/user/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeader()
                },
                credentials: 'include',
                body: JSON.stringify(updates)
            });

            const data = await response.json();
            if (!response.ok) {
                return { error: new Error(data.error || 'Update failed') };
            }

            return { data: data.user, error: null };
        } catch (err: any) {
            console.error('[ProfileService] updateProfile Runtime Error:', err);
            return { error: err };
        }
    }
};
