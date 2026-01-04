import { createClient } from '@/app/utils/supabase/client';
import { Product } from '@/app/types';

export const productService = {
    async getActiveProducts(): Promise<Product[]> {
        const supabase = createClient();

        const { data, error } = await supabase
            .from('products')
            .select(`
                *,
                categories (
                    id,
                    label,
                    icon
                )
            `)
            .eq('is_available', true)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching products:', error);
            return [];
        }

        // Map DB structure to Application Type
        return data.map((item: any) => ({
            id: item.id,
            title: item.title,
            subtitle: item.subtitle,
            description: item.description,

            base_price: item.base_price || 0,
            price: item.base_price || 0, // Default display price

            image_url: item.image_url || '',
            image: item.image_url || '', // Map for UI compatibility

            category_id: item.category_id,
            category: item.categories?.label || item.category || 'Boshqa', // Prefer joined label
            categoryId: item.category_id, // Map for UI compatibility

            is_available: item.is_available,
            is_ready: item.is_ready || false,
            variants: Array.isArray(item.variants) ? item.variants : [],
            details: item.details
        }));
    },

    async getAllProductsAdmin(): Promise<Product[]> {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .is('deleted_at', null) // Only fetch non-deleted
            .order('created_at', { ascending: false });

        if (error) return [];

        return data.map((item: any) => ({
            ...item,
            image: item.image_url,
            price: item.base_price,
            is_ready: item.is_ready || false
        }));
    },

    // Hard Delete for Products
    async deleteProduct(id: string): Promise<{ error: any }> {
        const supabase = createClient();
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);
        return { error };
    },

    async toggleProductAvailability(id: string, isAvailable: boolean): Promise<{ data: any; error: any }> {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('products')
            .update({ is_available: isAvailable })
            .eq('id', id)
            .select();
        return { data, error };
    },

    async toggleProductReady(id: string, isReady: boolean): Promise<{ data: any; error: any }> {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('products')
            .update({ is_ready: isReady })
            .eq('id', id)
            .select();
        return { data, error };
    }
};
