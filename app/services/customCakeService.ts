import { createClient } from '@/app/utils/supabase/client';

export interface CustomOption {
    id: string;
    type: 'cake_type' | 'nachinka' | 'size';
    label_uz: string;
    label_ru?: string;
    sub_label_uz?: string;
    sub_label_ru?: string;
    image_url?: string;
    price: number;
    is_available: boolean;
    sort_order: number;
    parent_id?: string | null;
}

export const customCakeService = {
    /**
     * Client-side fetch: RLS enforces is_available = TRUE (for client wizard).
     */
    async getOptions(): Promise<CustomOption[]> {
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

    /**
     * Admin-side fetch via service-role API route.
     * Returns ALL rows including those with is_available = FALSE.
     */
    async getAllOptions(): Promise<CustomOption[]> {
        const res = await fetch('/api/admin/custom-options');
        if (!res.ok) {
            console.error('[customCakeService] getAllOptions failed:', await res.text());
            return [];
        }
        return res.json();
    },

    /**
     * Admin-side save (create or update) via service-role API route.
     */
    async saveOption(option: Partial<CustomOption>): Promise<{ data: CustomOption | null; error: string | null }> {
        if (option.id) {
            // Update existing
            const res = await fetch('/api/admin/custom-options', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(option),
            });
            if (!res.ok) {
                const err = await res.text();
                console.error('[customCakeService] saveOption PATCH failed:', err);
                return { data: null, error: err };
            }
            const data = await res.json();
            return { data, error: null };
        } else {
            // Insert new
            const res = await fetch('/api/admin/custom-options', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(option),
            });
            if (!res.ok) {
                const err = await res.text();
                console.error('[customCakeService] saveOption POST failed:', err);
                return { data: null, error: err };
            }
            const data = await res.json();
            return { data, error: null };
        }
    },

    /**
     * Admin-side delete via service-role API route.
     */
    async deleteOption(id: string): Promise<{ error: string | null }> {
        const res = await fetch(`/api/admin/custom-options?id=${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const err = await res.text();
            console.error('[customCakeService] deleteOption failed:', err);
            return { error: err };
        }
        return { error: null };
    }
};
