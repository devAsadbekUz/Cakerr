'use server';

import { revalidatePath } from 'next/cache';
import { serviceClient } from '@/app/utils/supabase/service';
import { isAdminVerified } from '@/app/utils/admin-auth';

export async function deleteProductAction(id: string) {
    if (!await isAdminVerified()) {
        throw new Error('Unauthorized');
    }

    try {
        const { error } = await serviceClient
            .from('products')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            console.error('[Product Action] Delete error:', error);
            return { error: error.message };
        }

        revalidatePath('/admin/products');
        return { success: true };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function toggleProductAvailabilityAction(id: string, isAvailable: boolean) {
    if (!await isAdminVerified()) {
        throw new Error('Unauthorized');
    }

    try {
        const { error } = await serviceClient
            .from('products')
            .update({ is_available: isAvailable })
            .eq('id', id);

        if (error) {
            console.error('[Product Action] Visibility error:', error);
            return { error: error.message };
        }

        revalidatePath('/admin/products');
        return { success: true };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function toggleProductReadyAction(id: string, isReady: boolean) {
    if (!await isAdminVerified()) {
        throw new Error('Unauthorized');
    }

    try {
        const { error } = await serviceClient
            .from('products')
            .update({ is_ready: isReady })
            .eq('id', id);

        if (error) {
            console.error('[Product Action] Ready toggle error:', error);
            return { error: error.message };
        }

        revalidatePath('/admin/products');
        return { success: true };
    } catch (err: any) {
        return { error: err.message };
    }
}
