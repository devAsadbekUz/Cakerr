'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSupabase } from './AuthContext';
import { addressService } from '../services/addressService';
import { cartService } from '../services/cartService';

const mapDBCartItemToCartItem = (dbItem: any): CartItem => ({
    cartId: dbItem.id,
    id: dbItem.product_id,
    name: dbItem.products?.title || dbItem.configuration?.name || 'Mahsulot',
    price: dbItem.products?.base_price || dbItem.configuration?.estimated_total || 0,
    image: dbItem.products?.image_url || dbItem.configuration?.image_url || dbItem.configuration?.uploaded_photo_url || '',
    portion: dbItem.portion,
    flavor: dbItem.flavor,
    quantity: dbItem.quantity,
    customNote: dbItem.custom_note,
    configuration: dbItem.configuration
});

export interface CartItem {
    cartId: string; // Unique ID for each item in cart (to distinguish same product with different options)
    id: string;
    name: string;
    price: number;
    image: string;
    portion: string;
    flavor: string;
    quantity: number;
    customNote?: string;
    configuration?: any; // Generic object for custom cake configuration
}

export interface SavedAddress {
    id: string;
    label: string;
    address: string;
    type: 'home' | 'work' | 'other';
    lat?: number;
    lng?: number;
}

interface ClearCartOptions {
    rollbackOnError?: boolean;
    syncServer?: boolean;
}

interface CartActionsContextType {
    addItem: (item: Omit<CartItem, 'cartId'>) => Promise<void>;
    removeItem: (cartId: string) => Promise<void>;
    updateQuantity: (cartId: string, quantity: number) => Promise<void>;
    clearCart: (options?: ClearCartOptions) => Promise<void>;
}

interface CartContextType {
    cart: CartItem[];
    totalItems: number;
    subtotal: number;
    deliveryAddress: string;
    setDeliveryAddress: (address: string) => void;
    deliveryCoords: { lat: number; lng: number } | null;
    setDeliveryCoords: (coords: { lat: number; lng: number } | null) => void;
    savedAddresses: SavedAddress[];
    addSavedAddress: (address: Omit<SavedAddress, 'id'>) => void;
    updateSavedAddress: (id: string, updates: Partial<SavedAddress>) => void;
    removeSavedAddress: (id: string) => void;
}

// Actions context: stable reference — only changes when user changes
const CartActionsContext = createContext<CartActionsContextType | undefined>(undefined);
// State context: changes when cart/address/etc. changes
const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [deliveryAddress, setDeliveryAddress] = useState<string>('Toshkent');
    const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const { user } = useSupabase();
    const prevUser = useRef<any>(null);
    // Always-current cart reference so callbacks don't close over stale state
    const cartRef = useRef<CartItem[]>([]);
    useEffect(() => { cartRef.current = cart; }, [cart]);

    // Per-item debounce queue: coalesces rapid taps into a single API call
    const pendingAdds = useRef<Map<string, { quantity: number; timer: ReturnType<typeof setTimeout>; tempIds: string[] }>>(new Map());

    // Load and Sync Addresses
    useEffect(() => {
        if (!isInitialized) {
            // Defer localStorage reads so they don't block first paint
            setTimeout(() => {
                const savedCart = localStorage.getItem('tortele_cart');
                if (savedCart) {
                    try { setCart(JSON.parse(savedCart)); } catch (e) { console.error(e); }
                }
                const savedAddress = localStorage.getItem('tortele_address');
                if (savedAddress) setDeliveryAddress(savedAddress);

                const savedCoords = localStorage.getItem('tortele_coords');
                if (savedCoords) {
                    try { setDeliveryCoords(JSON.parse(savedCoords)); } catch (e) { console.error(e); }
                }

                const savedList = localStorage.getItem('tortele_saved_addresses');
                if (savedList) {
                    try { setSavedAddresses(JSON.parse(savedList)); } catch (e) { console.error(e); }
                } else {
                    setSavedAddresses([
                        { id: 'm1', label: 'Uy', address: 'Mustaqillik shoh ko\'chasi', type: 'home', lat: 41.3110, lng: 69.2405 },
                        { id: 'm2', label: 'Ish', address: 'Amir Temur ko\'chasi', type: 'work', lat: 41.3323, lng: 69.2123 }
                    ]);
                }
                setIsInitialized(true);
            }, 0);
        }
    }, []);

    // Sync with Database when user status changes
    useEffect(() => {
        if (isInitialized) {
            if (user) {
                const syncDB = async () => {
                    await Promise.all([fetchDBAddresses(), fetchDBCart()]);
                };
                syncDB().catch(err => console.error('[CartContext] DB sync failed:', err));
            } else {
                // Logout case: Clear state or revert to what's in localstorage?
                if (prevUser.current && prevUser.current.id) {
                    setCart([]);
                    localStorage.removeItem('tortele_cart');
                    localStorage.removeItem('tortele_cart_owner');
                } else {
                    const savedCart = localStorage.getItem('tortele_cart');
                    if (savedCart) {
                        try { setCart(JSON.parse(savedCart)); } catch (e) { setCart([]); }
                    } else {
                        setCart([]);
                    }
                }
            }
            prevUser.current = user;
        }
    }, [user, isInitialized]);

    const fetchDBCart = async () => {
        try {
            const dbItems = await cartService.getCartItems();
            const cartOwner = localStorage.getItem('tortele_cart_owner');

            // If user logged in and has local guest cart, migrate it!
            if (dbItems.length === 0 && cart.length > 0 && cartOwner === 'guest') {
                await migrateGuestCart(cart);
                return;
            }

            if (dbItems.length === 0) {
                setCart([]);
            } else if (dbItems.length > 0) {
                setCart(dbItems.map(mapDBCartItemToCartItem));
            }
        } catch (err) {
            console.error('[CartContext] fetchDBCart failed:', err);
            // Leave existing cart state intact — do not clear on network error
        }
    };

    const migrateGuestCart = async (guestCart: CartItem[]) => {
        try {
            // Single batch request instead of N sequential requests
            await cartService.addItemsBatch(guestCart.map(item => ({
                product_id: item.id,
                quantity: item.quantity,
                portion: item.portion,
                flavor: item.flavor,
                custom_note: item.customNote,
                configuration: item.configuration
            })));

            localStorage.removeItem('tortele_cart');

            const finalItems = await cartService.getCartItems();
            setCart(finalItems.map(mapDBCartItemToCartItem));
        } catch (err) {
            console.error('[CartContext] migrateGuestCart failed:', err);
            // Guest cart remains local — user keeps their items
        }
    };

    const fetchDBAddresses = async () => {
        let dbAddresses: any[] = [];
        try {
            dbAddresses = await addressService.getUserAddresses();
        } catch (err) {
            console.error('[CartContext] fetchDBAddresses failed:', err);
            return;
        }

        // If user logged in and has local guest addresses, migrate them!
        if (dbAddresses.length === 0 && savedAddresses.length > 0) {
            const actualGuestAddresses = savedAddresses.filter(a => !['m1', 'm2'].includes(a.id));
            if (actualGuestAddresses.length > 0) {
                await migrateGuestAddresses(actualGuestAddresses);
                return;
            }
        }

        if (dbAddresses.length > 0) {
            const mapped: SavedAddress[] = dbAddresses.map(addr => ({
                id: addr.id,
                label: addr.label,
                address: addr.address_text,
                type: addr.label.toLowerCase() === 'uy' ? 'home' :
                    addr.label.toLowerCase() === 'ish' ? 'work' : 'other',
                lat: Number(addr.lat),
                lng: Number(addr.lng)
            }));
            setSavedAddresses(mapped);

            // Auto-select default address if needed
            const defaultAddr = dbAddresses.find(a => a.is_default);
            if (defaultAddr) {
                setDeliveryAddress(defaultAddr.address_text);
                setDeliveryCoords({ lat: Number(defaultAddr.lat), lng: Number(defaultAddr.lng) });
            }
        }
    };

    const migrateGuestAddresses = async (actualGuestAddresses: SavedAddress[]) => {
        // Single batch request — use returned data directly, no extra re-fetch needed
        const inserted = await addressService.addAddressBatch(
            actualGuestAddresses.map(addr => ({
                label: addr.label,
                address_text: addr.address,
                lat: addr.lat,
                lng: addr.lng,
                is_default: false
            }))
        );

        localStorage.removeItem('tortele_saved_addresses');

        if (inserted.length > 0) {
            const mapped: SavedAddress[] = inserted.map((addr: any) => ({
                id: addr.id,
                label: addr.label,
                address: addr.address_text,
                type: addr.label.toLowerCase() === 'uy' ? 'home' :
                    addr.label.toLowerCase() === 'ish' ? 'work' : 'other',
                lat: Number(addr.lat),
                lng: Number(addr.lng)
            }));
            setSavedAddresses(mapped);
        }
    };

    // Save to localStorage on change with QuotaExceededError protection
    useEffect(() => {
        try {
            localStorage.setItem('tortele_cart', JSON.stringify(cart));
            localStorage.setItem('tortele_cart_owner', user ? user.id : 'guest');
        } catch (e: any) {
            if (e.name === 'QuotaExceededError') {
                console.error('[CartContext] localStorage quota exceeded');
                alert('Savatchangiz juda katta (rasmlar ko\'p). Savatcha tarkibi saqlanmasligi mumkin.');
            } else {
                console.error('[CartContext] localStorage error:', e);
            }
        }
    }, [cart, user]);

    useEffect(() => {
        try {
            localStorage.setItem('tortele_address', deliveryAddress);
        } catch (e) {
            console.error('[CartContext] Failed to save address:', e);
        }
    }, [deliveryAddress]);

    useEffect(() => {
        if (deliveryCoords) {
            try {
                localStorage.setItem('tortele_coords', JSON.stringify(deliveryCoords));
            } catch (e) {
                console.error('[CartContext] Failed to save coords:', e);
            }
        } else {
            localStorage.removeItem('tortele_coords');
        }
    }, [deliveryCoords]);

    useEffect(() => {
        if (isInitialized) {
            try {
                localStorage.setItem('tortele_saved_addresses', JSON.stringify(savedAddresses));
            } catch (e) {
                console.error('[CartContext] Failed to save addresses:', e);
            }
        }
    }, [savedAddresses, isInitialized]);

    const addItem = useCallback(async (newItem: Omit<CartItem, 'cartId'>) => {
        const tempId = `temp-${newItem.id}-${Date.now()}`;
        const itemWithId = { ...newItem, cartId: tempId };

        // 1. Optimistic update — instant, no wait
        setCart((prev) => {
            const existingItemIndex = prev.findIndex(
                (item) =>
                    item.id !== '00000000-0000-0000-0000-000000000000' &&
                    item.id === newItem.id &&
                    item.portion === newItem.portion &&
                    item.flavor === newItem.flavor
            );
            if (existingItemIndex > -1) {
                const updatedCart = [...prev];
                updatedCart[existingItemIndex] = {
                    ...updatedCart[existingItemIndex],
                    quantity: updatedCart[existingItemIndex].quantity + newItem.quantity
                };
                return updatedCart;
            }
            return [...prev, itemWithId];
        });

        if (!user) return;

        // 2. Coalesce rapid taps: accumulate quantity, reset 150ms debounce timer
        const key = `${newItem.id}|${newItem.portion}|${newItem.flavor}`;
        const existing = pendingAdds.current.get(key);
        if (existing) {
            clearTimeout(existing.timer);
            existing.quantity += newItem.quantity;
            existing.tempIds.push(tempId);
        } else {
            pendingAdds.current.set(key, { quantity: newItem.quantity, timer: null as any, tempIds: [tempId] });
        }

        const pending = pendingAdds.current.get(key)!;
        pending.timer = setTimeout(async () => {
            pendingAdds.current.delete(key);
            const snapshot = cartRef.current;
            try {
                const { data, error } = await cartService.addItem({
                    product_id: newItem.id,
                    quantity: pending.quantity,
                    portion: newItem.portion,
                    flavor: newItem.flavor,
                    custom_note: newItem.customNote,
                    configuration: newItem.configuration
                });
                if (error) throw error;
                if (data) {
                    const serverItem = mapDBCartItemToCartItem(data);
                    // Replace all tempIds for this product with the single confirmed server item
                    setCart((prev) => {
                        const withoutTemps = prev.filter(item => !pending.tempIds.includes(item.cartId));
                        // Check if there's already a real (non-temp) entry for this product
                        const hasReal = withoutTemps.some(
                            item => item.id === newItem.id && item.portion === newItem.portion && item.flavor === newItem.flavor
                        );
                        if (hasReal) {
                            return withoutTemps.map(item =>
                                item.id === newItem.id && item.portion === newItem.portion && item.flavor === newItem.flavor
                                    ? serverItem
                                    : item
                            );
                        }
                        return [...withoutTemps, serverItem];
                    });
                }
            } catch (err: any) {
                console.error('[Cart] AddItem Error:', err);
                setCart(snapshot);
                alert(`Savatga qo'shishda xatolik yuz berdi: ${err.message}`);
            }
        }, 150);
    }, [user]);

    const removeItem = useCallback(async (cartId: string) => {
        const previousCart = cartRef.current;
        setCart((prev) => prev.filter((item) => item.cartId !== cartId));

        if (user && !cartId.startsWith('temp-')) {
            try {
                const { success, error } = await cartService.removeItem(cartId);
                if (!success || error) throw error || new Error('Delete failed');
            } catch (err: any) {
                console.error('[Cart Optimization] Rollback removal:', err);
                setCart(previousCart);
                alert('O\'chirishda xatolik yuz berdi. Iltimos qayta urinib ko\'ring.');
            }
        }
    }, [user]);

    const updateQuantity = useCallback(async (cartId: string, quantity: number) => {
        const newQty = Math.max(1, quantity);
        setCart((prev) =>
            prev.map((item) =>
                item.cartId === cartId ? { ...item, quantity: newQty } : item
            )
        );

        if (user && !cartId.startsWith('temp-')) {
            if (debounceTimers.current[cartId]) {
                clearTimeout(debounceTimers.current[cartId]);
            }

            debounceTimers.current[cartId] = setTimeout(async () => {
                try {
                    const { error } = await cartService.updateItem(cartId, { quantity: newQty });
                    if (error) throw error;
                    delete debounceTimers.current[cartId];
                } catch (err) {
                    console.error('[Cart Optimization] UpdateQuantity Error:', err);
                    fetchDBCart();
                }
            }, 400);
        }
    }, [user]);

    const clearCart = useCallback(async (options?: ClearCartOptions) => {
        const previousCart = cartRef.current;
        setCart([]);
        if (user && (options?.syncServer ?? true)) {
            try {
                const { success, error } = await cartService.clearCart();
                if (!success || error) throw error;
            } catch (err) {
                console.error('[Cart Optimization] ClearCart Error:', err);
                if (options?.rollbackOnError ?? true) {
                    setCart(previousCart);
                }
            }
        }
    }, [user]);

    const addSavedAddress = useCallback(async (newAddr: Omit<SavedAddress, 'id'>) => {
        if (user) {
            const { data, error } = await addressService.addAddress({
                label: newAddr.label,
                address_text: newAddr.address,
                lat: newAddr.lat,
                lng: newAddr.lng,
                is_default: savedAddresses.length === 0
            });
            if (!error && data) {
                fetchDBAddresses();
            }
        } else {
            const id = `addr-${Date.now()}`;
            setSavedAddresses(prev => [...prev, { ...newAddr, id }]);
        }
    }, [user, savedAddresses.length]);

    const updateSavedAddress = useCallback(async (id: string, updates: Partial<SavedAddress>) => {
        if (user && !id.startsWith('addr-')) {
            await addressService.updateAddress(id, {
                label: updates.label,
                address_text: updates.address,
                lat: updates.lat,
                lng: updates.lng
            });
            fetchDBAddresses();
        } else {
            setSavedAddresses(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
        }
    }, [user]);

    const removeSavedAddress = useCallback(async (id: string) => {
        if (user && !id.startsWith('addr-')) {
            await addressService.deleteAddress(id);
            fetchDBAddresses();
        } else {
            setSavedAddresses(prev => prev.filter(a => a.id !== id));
        }
    }, [user]);

    // For debouncing quantity updates
    const debounceTimers = useRef<{ [key: string]: NodeJS.Timeout }>({});

    const totalItems = useMemo(() => cart.reduce((sum, item) => sum + (item.quantity || 0), 0), [cart]);
    const subtotal = useMemo(() => cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (item.quantity || 0), 0), [cart]);

    // Actions value: stable — only recreated when user changes (addItem/removeItem/clearCart deps = [user])
    const actionsValue = useMemo(() => ({
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
    }), [addItem, removeItem, updateQuantity, clearCart]);

    // State value: changes with cart/address state
    const stateValue = useMemo(() => ({
        cart,
        totalItems,
        subtotal,
        deliveryAddress,
        setDeliveryAddress,
        deliveryCoords,
        setDeliveryCoords,
        savedAddresses,
        addSavedAddress,
        updateSavedAddress,
        removeSavedAddress,
    }), [
        cart,
        totalItems,
        subtotal,
        deliveryAddress,
        deliveryCoords,
        savedAddresses,
        addSavedAddress,
        updateSavedAddress,
        removeSavedAddress
    ]);

    return (
        <CartActionsContext.Provider value={actionsValue}>
            <CartContext.Provider value={stateValue}>
                {children}
            </CartContext.Provider>
        </CartActionsContext.Provider>
    );
}

/** Full cart state: cart items, totals, addresses. Rerenders on every cart change. */
export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}

const NO_OP_CART_ACTIONS: CartActionsContextType = {
    addItem: async () => {
        if (process.env.NODE_ENV === 'development') console.warn('[useCartActions] addItem called outside CartProvider — no-op');
    },
    removeItem: async () => {
        if (process.env.NODE_ENV === 'development') console.warn('[useCartActions] removeItem called outside CartProvider — no-op');
    },
    updateQuantity: async () => {
        if (process.env.NODE_ENV === 'development') console.warn('[useCartActions] updateQuantity called outside CartProvider — no-op');
    },
    clearCart: async () => {
        if (process.env.NODE_ENV === 'development') console.warn('[useCartActions] clearCart called outside CartProvider — no-op');
    },
};

/** Cart actions only: addItem, removeItem, updateQuantity, clearCart.
 *  Stable reference — does NOT rerender when cart state changes.
 *  Use this in ProductCard and any component that only needs to mutate the cart.
 *  Returns no-op stubs when called outside CartProvider (e.g. in POS context). */
export function useCartActions() {
    const context = useContext(CartActionsContext);
    return context ?? NO_OP_CART_ACTIONS;
}
