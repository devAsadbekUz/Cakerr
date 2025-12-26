'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

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
    const [deliveryAddress, setDeliveryAddress] = useState<string>('Kinaiseppskv District');
    const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load from localStorage on init
    useEffect(() => {
        const savedCart = localStorage.getItem('cakerr_cart');
        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart));
            } catch (e) {
                console.error('Failed to parse cart', e);
            }
        }
        const savedAddress = localStorage.getItem('cakerr_address');
        if (savedAddress) {
            setDeliveryAddress(savedAddress);
        }
        const savedList = localStorage.getItem('cakerr_saved_addresses');
        if (savedList) {
            try {
                setSavedAddresses(JSON.parse(savedList));
            } catch (e) {
                console.error('Failed to parse saved addresses', e);
            }
        } else {
            // Only set default addresses if localStorage is empty
            setSavedAddresses([
                { id: 'm1', label: 'Дом', address: 'Малая кольцевая дорога', type: 'home', lat: 41.3110, lng: 69.2405 },
                { id: 'm2', label: 'Beruniy 1-dahasi, 4A', address: 'Toshkent', type: 'other', lat: 41.3323, lng: 69.2123 },
                { id: 'm3', label: 'Дом', address: 'Qiyot dahasi, 100', type: 'home', lat: 41.3523, lng: 69.2823 },
                { id: 'm4', label: 'Дом', address: 'Kichik halqa yo\'li, 9A', type: 'home', lat: 41.2823, lng: 69.2023 },
                { id: 'm5', label: 'Uy', address: 'Mingo\'rik mahallasi', type: 'home', lat: 41.3023, lng: 69.2623 },
                { id: 'm6', label: 'Tallimarjon ko\'chasi, 1A', address: 'Toshkent', type: 'other', lat: 41.2923, lng: 69.3023 }
            ]);
        }
        setIsInitialized(true);
    }, []);

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

    const addSavedAddress = (newAddr: Omit<SavedAddress, 'id'>) => {
        const id = `addr-${Date.now()}`;
        setSavedAddresses(prev => [...prev, { ...newAddr, id }]);
    };

    const updateSavedAddress = (id: string, updates: Partial<SavedAddress>) => {
        setSavedAddresses(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    };

    const removeSavedAddress = (id: string) => {
        setSavedAddresses(prev => prev.filter(a => a.id !== id));
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
