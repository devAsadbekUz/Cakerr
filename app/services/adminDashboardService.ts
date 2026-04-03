import type { AdminDashboardData } from '@/app/types';
import { createEmptyDashboardData } from '@/app/types/admin-dashboard';

export const adminDashboardService = {
    async getDashboardData(filterDays: number | null = 30): Promise<AdminDashboardData> {
        try {
            const params = new URLSearchParams();
            params.set('days', filterDays === null ? 'all' : String(filterDays));

            const response = await fetch(`/api/admin/dashboard?${params.toString()}`, {
                credentials: 'include',
                cache: 'no-store',
            });

            if (!response.ok) {
                console.error('[AdminDashboardService] API error:', response.status);
                return createEmptyDashboardData(filterDays);
            }

            const data = await response.json();
            return data as AdminDashboardData;
        } catch (err) {
            console.error('[AdminDashboardService] Fetch error:', err);
            return createEmptyDashboardData(filterDays);
        }
    },
};
