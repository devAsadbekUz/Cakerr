import { getAuthHeader } from '@/app/utils/telegram';

const API_BASE = '/api/user/cart';

export interface DBCartItem {
    id: string;
    product_id: string;
    quantity: number;
    portion: string;
    flavor: string;
    custom_note?: string;
    configuration?: any;
}

export const cartService = {
    async getCartItems(): Promise<DBCartItem[]> {
        try {
            const response = await fetch(API_BASE, {
                headers: getAuthHeader(),
                credentials: 'include'
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    return [];
                }
                console.error('[CartService] Error fetching cart:', response.status);
                return [];
            }

            const data = await response.json();
            return data.cart || [];
        } catch (err) {
            console.error('[CartService] getCartItems Runtime Error:', err);
            return [];
        }
    },

    async addItem(item: Omit<DBCartItem, 'id'>): Promise<{ data?: DBCartItem; error: any }> {
        try {
            const response = await fetch(API_BASE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeader()
                },
                credentials: 'include',
                body: JSON.stringify(item)
            });

            const data = await response.json();
            if (!response.ok) {
                return { error: new Error(data.error || 'Add failed') };
            }

            return { data: data.item, error: null };
        } catch (err: any) {
            console.error('[CartService] addItem Runtime Error:', err);
            return { error: err };
        }
    },

    async updateItem(id: string, updates: Partial<DBCartItem>): Promise<{ data?: DBCartItem; error: any }> {
        try {
            const response = await fetch(API_BASE, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeader()
                },
                credentials: 'include',
                body: JSON.stringify({ id, ...updates })
            });

            const data = await response.json();
            if (!response.ok) {
                return { error: new Error(data.error || 'Update failed') };
            }

            return { data: data.item, error: null };
        } catch (err: any) {
            console.error('[CartService] updateItem Runtime Error:', err);
            return { error: err };
        }
    },

    async removeItem(id: string): Promise<{ success: boolean; error: any }> {
        try {
            const response = await fetch(API_BASE, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeader()
                },
                credentials: 'include',
                body: JSON.stringify({ id })
            });

            const data = await response.json();
            if (!response.ok) {
                return { success: false, error: new Error(data.error || 'Remove failed') };
            }

            return { success: true, error: null };
        } catch (err: any) {
            console.error('[CartService] removeItem Runtime Error:', err);
            return { success: false, error: err };
        }
    },

    async addItemsBatch(items: Omit<DBCartItem, 'id'>[]): Promise<void> {
        if (items.length === 0) return;
        try {
            await fetch(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                credentials: 'include',
                body: JSON.stringify(items),
            });
        } catch (err) {
            console.error('[CartService] addItemsBatch error:', err);
        }
    },

    async clearCart(): Promise<{ success: boolean; error: any }> {
        try {
            const response = await fetch(API_BASE, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeader()
                },
                credentials: 'include',
                body: JSON.stringify({ clearAll: true })
            });

            const data = await response.json();
            if (!response.ok) {
                return { success: false, error: new Error(data.error || 'Clear failed') };
            }

            return { success: true, error: null };
        } catch (err: any) {
            console.error('[CartService] clearCart Runtime Error:', err);
            return { success: false, error: err };
        }
    }
};
