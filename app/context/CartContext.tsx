'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSupabase } from './AuthContext';
import { addressService } from '../services/addressService';
import { cartService } from '../services/cartService';

const mapDBCartItemToCartItem = (dbItem: any): CartItem => ({
    cartId: dbItem.id,
    id: dbItem.product_id,
    name: dbItem.products?.title || 'Mahsulot',
    price: dbItem.products?.base_price || 0,
    image: dbItem.products?.image_url || '',
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

interface CartContextType {
    cart: CartItem[];
    addItem: (item: Omit<CartItem, 'cartId'>) => Promise<void>;
    removeItem: (cartId: string) => Promise<void>;
    updateQuantity: (cartId: string, quantity: number) => Promise<void>;
    clearCart: () => Promise<void>;
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

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [deliveryAddress, setDeliveryAddress] = useState<string>('Toshkent');
    const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const { user } = useSupabase();

    // Load and Sync Addresses
    useEffect(() => {
        if (!isInitialized) {
            // Initial load from localStorage
            const savedCart = localStorage.getItem('cakerr_cart');
            if (savedCart) {
                try { setCart(JSON.parse(savedCart)); } catch (e) { console.error(e); }
            }
            const savedAddress = localStorage.getItem('cakerr_address');
            if (savedAddress) setDeliveryAddress(savedAddress);

            const savedCoords = localStorage.getItem('cakerr_coords');
            if (savedCoords) {
                try { setDeliveryCoords(JSON.parse(savedCoords)); } catch (e) { console.error(e); }
            }

            const savedList = localStorage.getItem('cakerr_saved_addresses');
            if (savedList) {
                try { setSavedAddresses(JSON.parse(savedList)); } catch (e) { console.error(e); }
            } else {
                // Default seeds for new guests
                setSavedAddresses([
                    { id: 'm1', label: 'Uy', address: 'Mustaqillik shoh ko\'chasi', type: 'home', lat: 41.3110, lng: 69.2405 },
                    { id: 'm2', label: 'Ish', address: 'Amir Temur ko\'chasi', type: 'work', lat: 41.3323, lng: 69.2123 }
                ]);
            }
            setIsInitialized(true);
        }
    }, []);

    // Sync with Database when user status changes
    useEffect(() => {
        if (isInitialized) {
            if (user) {
                fetchDBAddresses();
                fetchDBCart();
            } else {
                // Logout case: Clear state or revert to what's in localstorage?
                // Re-loading from localStorage is safer to avoid showing previous user's cart
                const savedCart = localStorage.getItem('cakerr_cart');
                if (savedCart) {
                    try { setCart(JSON.parse(savedCart)); } catch (e) { setCart([]); }
                } else {
                    setCart([]);
                }
            }
        }
    }, [user, isInitialized]);

    const fetchDBCart = async () => {
        const dbItems = await cartService.getCartItems();

        // If user logged in and has local guest cart, migrate it!
        if (dbItems.length === 0 && cart.length > 0) {
            await migrateGuestCart(cart);
            return;
        }

        if (dbItems.length > 0) {
            setCart(dbItems.map(mapDBCartItemToCartItem));
        }
    };

    const migrateGuestCart = async (guestCart: CartItem[]) => {
        for (const item of guestCart) {
            await cartService.addItem({
                product_id: item.id,
                quantity: item.quantity,
                portion: item.portion,
                flavor: item.flavor,
                custom_note: item.customNote,
                configuration: item.configuration
            });
        }
        // Clear local storage cart
        localStorage.removeItem('cakerr_cart');
        
        // Fetch fresh state from DB
        const finalItems = await cartService.getCartItems();
        setCart(finalItems.map(mapDBCartItemToCartItem));
    };

    const fetchDBAddresses = async () => {
        const dbAddresses = await addressService.getUserAddresses();

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
        for (const addr of actualGuestAddresses) {
            await addressService.addAddress({
                label: addr.label,
                address_text: addr.address,
                lat: addr.lat,
                lng: addr.lng,
                is_default: false
            });
        }

        // Clear local storage list to prevent double migration
        localStorage.removeItem('cakerr_saved_addresses');

        // Final fetch to get fresh DB state with new IDs
        const finalAddresses = await addressService.getUserAddresses();
        const mapped: SavedAddress[] = finalAddresses.map(addr => ({
            id: addr.id,
            label: addr.label,
            address: addr.address_text,
            type: addr.label.toLowerCase() === 'uy' ? 'home' :
                addr.label.toLowerCase() === 'ish' ? 'work' : 'other',
            lat: Number(addr.lat),
            lng: Number(addr.lng)
        }));
        setSavedAddresses(mapped);
    };

    // Save to localStorage on change with QuotaExceededError protection
    useEffect(() => {
        try {
            localStorage.setItem('cakerr_cart', JSON.stringify(cart));
        } catch (e: any) {
            if (e.name === 'QuotaExceededError') {
                console.error('[CartContext] localStorage quota exceeded');
                alert('Savatchangiz juda katta (rasmlar ko\'p). Savatcha tarkibi saqlanmasligi mumkin.');
            } else {
                console.error('[CartContext] localStorage error:', e);
            }
        }
    }, [cart]);

    useEffect(() => {
        try {
            localStorage.setItem('cakerr_address', deliveryAddress);
        } catch (e) {
            console.error('[CartContext] Failed to save address:', e);
        }
    }, [deliveryAddress]);

    useEffect(() => {
        if (deliveryCoords) {
            try {
                localStorage.setItem('cakerr_coords', JSON.stringify(deliveryCoords));
            } catch (e) {
                console.error('[CartContext] Failed to save coords:', e);
            }
        } else {
            localStorage.removeItem('cakerr_coords');
        }
    }, [deliveryCoords]);

    useEffect(() => {
        if (isInitialized) {
            try {
                localStorage.setItem('cakerr_saved_addresses', JSON.stringify(savedAddresses));
            } catch (e) {
                console.error('[CartContext] Failed to save addresses:', e);
            }
        }
    }, [savedAddresses, isInitialized]);

    const addItem = useCallback(async (newItem: Omit<CartItem, 'cartId'>) => {
        const tempId = `temp-${newItem.id}-${Date.now()}`;
        const itemWithId = { ...newItem, cartId: tempId };
        const previousCart = [...cart];

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
                updatedCart[existingItemIndex].quantity += newItem.quantity;
                return updatedCart;
            }
            return [...prev, itemWithId];
        });

        if (user) {
            try {
                const { data, error } = await cartService.addItem({
                    product_id: newItem.id,
                    quantity: newItem.quantity,
                    portion: newItem.portion,
                    flavor: newItem.flavor,
                    custom_note: newItem.customNote,
                    configuration: newItem.configuration
                });

                if (error) throw error;
                if (data) {
                    const serverItem = mapDBCartItemToCartItem(data);
                    setCart((prev) => prev.map(item => item.cartId === tempId ? serverItem : item));
                }
            } catch (err: any) {
                console.error('[Cart Optimization] AddItem Error:', err);
                setCart(previousCart);
                alert(`Savatga qo'shishda xatolik yuz berdi: ${err.message}`);
            }
        }
    }, [cart, user]);

    const removeItem = useCallback(async (cartId: string) => {
        const previousCart = [...cart];
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
    }, [cart, user]);

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

    const clearCart = useCallback(async () => {
        const previousCart = [...cart];
        setCart([]);
        if (user) {
            try {
                const { success, error } = await cartService.clearCart();
                if (!success || error) throw error;
            } catch (err) {
                console.error('[Cart Optimization] ClearCart Error:', err);
                setCart(previousCart);
            }
        }
    }, [cart, user]);

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

    const value = useMemo(() => ({
        cart,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
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
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
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
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
