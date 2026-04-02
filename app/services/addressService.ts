import { UserAddress } from '@/app/types';
import { getAuthHeader } from '@/app/utils/telegram';

const API_BASE = '/api/user/addresses';

export const addressService = {
    async getUserAddresses(): Promise<UserAddress[]> {
        try {
            const response = await fetch(API_BASE, {
                headers: getAuthHeader(),
                credentials: 'include'
            });

            if (!response.ok) {
                // If unauthorized (guest or expired session), just return empty silently
                if (response.status === 401 || response.status === 403) {
                    return [];
                }
                const errData = await response.json();
                console.error('Error fetching addresses:', errData.error);
                return [];
            }

            const data = await response.json();
            return data.addresses || [];
        } catch (err: any) {
            console.error('Error fetching addresses (Runtime):', err.message || err);
            return [];
        }
    },

    async addAddressBatch(addresses: Omit<UserAddress, 'id' | 'user_id'>[]): Promise<UserAddress[]> {
        if (addresses.length === 0) return [];
        try {
            const response = await fetch(API_BASE, {
                method: 'POST',
                headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(addresses),
            });
            if (!response.ok) return [];
            const result = await response.json();
            return result.addresses || [];
        } catch (err) {
            console.error('[AddressService] addAddressBatch error:', err);
            return [];
        }
    },

    async addAddress(address: Omit<UserAddress, 'id' | 'user_id'>): Promise<{ data: any; error: any }> {
        try {
            const response = await fetch(API_BASE, {
                method: 'POST',
                headers: {
                    ...getAuthHeader(),
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(address)
            });

            const result = await response.json();
            if (!response.ok) {
                return { data: null, error: new Error(result.error || 'Failed to add address') };
            }

            return { data: result.address, error: null };
        } catch (err: any) {
            return { data: null, error: err };
        }
    },

    async updateAddress(id: string, updates: Partial<UserAddress>): Promise<{ data: any; error: any }> {
        try {
            const response = await fetch(API_BASE, {
                method: 'PUT',
                headers: {
                    ...getAuthHeader(),
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ id, ...updates })
            });

            const result = await response.json();
            if (!response.ok) {
                return { data: null, error: new Error(result.error || 'Failed to update address') };
            }

            return { data: result, error: null };
        } catch (err: any) {
            return { data: null, error: err };
        }
    },

    async deleteAddress(id: string): Promise<{ error: any }> {
        try {
            const response = await fetch(API_BASE, {
                method: 'DELETE',
                headers: {
                    ...getAuthHeader(),
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ id })
            });

            const result = await response.json();
            if (!response.ok) {
                return { error: new Error(result.error || 'Failed to delete address') };
            }

            return { error: null };
        } catch (err: any) {
            return { error: err };
        }
    },

    async setDefaultAddress(id: string): Promise<{ error: any }> {
        try {
            const response = await fetch(API_BASE, {
                method: 'PUT',
                headers: {
                    ...getAuthHeader(),
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ id, setDefault: true })
            });

            const result = await response.json();
            if (!response.ok) {
                return { error: new Error(result.error || 'Failed to set default address') };
            }

            return { error: null };
        } catch (err: any) {
            return { error: err };
        }
    }
};
