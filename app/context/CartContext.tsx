'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSupabase } from './SupabaseContext';
import { addressService } from '../services/addressService';

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
    addItem: (item: Omit<CartItem, 'cartId'>) => void;
    removeItem: (cartId: string) => void;
    updateQuantity: (cartId: string, quantity: number) => void;
    clearCart: () => void;
    totalItems: number;
    subtotal: number;
    deliveryAddress: string;
    setDeliveryAddress: (address: string) => void;
    savedAddresses: SavedAddress[];
    addSavedAddress: (address: Omit<SavedAddress, 'id'>) => void;
    updateSavedAddress: (id: string, updates: Partial<SavedAddress>) => void;
    removeSavedAddress: (id: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [deliveryAddress, setDeliveryAddress] = useState<string>('Toshkent');
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

    // Sync with Database when user logs in
    useEffect(() => {
        if (isInitialized && user) {
            fetchDBAddresses();
        }
    }, [user, isInitialized]);

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
            if (defaultAddr) setDeliveryAddress(defaultAddr.address_text);
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

    // Save to localStorage on change
    useEffect(() => {
        localStorage.setItem('cakerr_cart', JSON.stringify(cart));
    }, [cart]);

    useEffect(() => {
        localStorage.setItem('cakerr_address', deliveryAddress);
    }, [deliveryAddress]);

    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem('cakerr_saved_addresses', JSON.stringify(savedAddresses));
        }
    }, [savedAddresses, isInitialized]);

    const addItem = (newItem: Omit<CartItem, 'cartId'>) => {
        setCart((prev) => {
            // Check if item with same ID, portion, and flavor already exists
            const existingItemIndex = prev.findIndex(
                (item) =>
                    item.id === newItem.id &&
                    item.portion === newItem.portion &&
                    item.flavor === newItem.flavor
            );

            if (existingItemIndex > -1) {
                const updatedCart = [...prev];
                updatedCart[existingItemIndex].quantity += newItem.quantity;
                return updatedCart;
            }

            const cartId = `${newItem.id}-${newItem.portion}-${newItem.flavor}-${Date.now()}`;
            return [...prev, { ...newItem, cartId }];
        });
    };

    const removeItem = (cartId: string) => {
        setCart((prev) => prev.filter((item) => item.cartId !== cartId));
    };

    const updateQuantity = (cartId: string, quantity: number) => {
        setCart((prev) =>
            prev.map((item) =>
                item.cartId === cartId ? { ...item, quantity: Math.max(1, quantity) } : item
            )
        );
    };

    const clearCart = () => setCart([]);

    const addSavedAddress = async (newAddr: Omit<SavedAddress, 'id'>) => {
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
    };

    const updateSavedAddress = async (id: string, updates: Partial<SavedAddress>) => {
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
    };

    const removeSavedAddress = async (id: string) => {
        if (user && !id.startsWith('addr-')) {
            await addressService.deleteAddress(id);
            fetchDBAddresses();
        } else {
            setSavedAddresses(prev => prev.filter(a => a.id !== id));
        }
    };

    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (item.quantity || 0), 0);

    return (
        <CartContext.Provider
            value={{
                cart,
                addItem,
                removeItem,
                updateQuantity,
                clearCart,
                totalItems,
                subtotal,
                deliveryAddress,
                setDeliveryAddress,
                savedAddresses,
                addSavedAddress,
                updateSavedAddress,
                removeSavedAddress,
            }}
        >
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
