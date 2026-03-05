import { createClient as createBrowserClient } from '@/app/utils/supabase/client';
import { Product } from '@/app/types';
import { adminFetch, adminUpdate, adminDelete } from '@/app/utils/adminApi';

export const productService = {
    async getActiveProducts(supabaseClient?: any): Promise<Product[]> {
        const supabase = supabaseClient || createBrowserClient();

        const { data, error } = await supabase
            .from('products')
            .select('id, title, subtitle, description, base_price, image_url, category_id, is_available, is_ready, variants, details')
            .eq('is_available', true)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching products:', error.message || error);
            return [];
        }

        // Map DB structure to Application Type
        return data.map((item: any) => ({
            id: item.id,
            title: item.title,
            subtitle: item.subtitle,
            description: item.description,
            base_price: item.base_price || 0,
            price: item.base_price || 0,
            image_url: item.image_url || '',
            image: item.image_url || '',
            category_id: item.category_id,
            category: item.categories?.label || item.category || 'Boshqa',
            categoryId: item.category_id,
            is_available: item.is_available,
            is_ready: item.is_ready || false,
            variants: Array.isArray(item.variants) ? item.variants : [],
            details: item.details
        }));
    },

    // Admin-only: Uses API route with Service Role Key (bypasses RLS)
    async getAllProductsAdmin(): Promise<Product[]> {
        try {
            const allProducts = await adminFetch({
                table: 'products',
                orderBy: 'created_at',
                orderAsc: false
            });

            // Filter out deleted products client-side (IS NULL not supported)
            const filtered = allProducts.filter((item: any) => !item.deleted_at);

            return filtered.map((item: any) => ({
                ...item,
                image: item.image_url,
                price: item.base_price,
                is_ready: item.is_ready || false
            }));
        } catch (err) {
            console.error('[productService] Admin fetch error:', err);
            return [];
        }
    },

    async deleteProduct(id: string): Promise<{ error: any }> {
        const success = await adminDelete('products', id);
        return { error: success ? null : { message: 'Delete failed' } };
    },

    async toggleProductAvailability(id: string, isAvailable: boolean): Promise<{ data: any; error: any }> {
        const data = await adminUpdate('products', id, { is_available: isAvailable });
        return { data, error: data ? null : { message: 'Update failed' } };
    },

    async toggleProductReady(id: string, isReady: boolean): Promise<{ data: any; error: any }> {
        const data = await adminUpdate('products', id, { is_ready: isReady });
        return { data, error: data ? null : { message: 'Update failed' } };
    }
};
