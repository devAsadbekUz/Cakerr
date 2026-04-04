'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CartItem } from './CartContext';

interface CustomerInfo {
    name: string;
    phone: string;
}

interface PosDeliveryInfo {
    address: string;
    date: Date | null;
    slot: string;
}

interface AdminCartContextType {
    cart: CartItem[];
    customerInfo: CustomerInfo;
    deliveryInfo: PosDeliveryInfo;
    
    addItem: (item: Omit<CartItem, 'cartId'>) => void;
    removeItem: (cartId: string) => void;
    updateQuantity: (cartId: string, quantity: number) => void;
    clearCart: () => void;
    
    setCustomerInfo: (info: Partial<CustomerInfo>) => void;
    setDeliveryInfo: (info: Partial<PosDeliveryInfo>) => void;
    
    subtotal: number;
    totalItems: number;
}

const AdminCartContext = createContext<AdminCartContextType | undefined>(undefined);

export function AdminCartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [customerInfo, setCustomerInfoState] = useState<CustomerInfo>({ name: '', phone: '' });
    const [deliveryInfo, setDeliveryInfoState] = useState<PosDeliveryInfo>({
        address: '',
        date: null,
        slot: ''
    });

    const setCustomerInfo = useCallback((info: Partial<CustomerInfo>) => {
        setCustomerInfoState(prev => ({ ...prev, ...info }));
    }, []);

    const setDeliveryInfo = useCallback((info: Partial<PosDeliveryInfo>) => {
        setDeliveryInfoState(prev => ({ ...prev, ...info }));
    }, []);

    const addItem = useCallback((newItem: Omit<CartItem, 'cartId'>) => {
        const cartId = `pos-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        setCart(prev => [...prev, { ...newItem, cartId }]);
    }, []);

    const removeItem = useCallback((cartId: string) => {
        setCart(prev => prev.filter(item => item.cartId !== cartId));
    }, []);

    const updateQuantity = useCallback((cartId: string, quantity: number) => {
        setCart(prev => prev.map(item => 
            item.cartId === cartId ? { ...item, quantity: Math.max(1, quantity) } : item
        ));
    }, []);

    const clearCart = useCallback(() => {
        setCart([]);
        setCustomerInfoState({ name: '', phone: '' });
        setDeliveryInfoState({ address: '', date: null, slot: '' });
    }, []);

    const subtotal = useMemo(() => 
        cart.reduce((sum, item) => sum + (Number(item.price) || 0) * item.quantity, 0)
    , [cart]);

    const totalItems = useMemo(() => 
        cart.reduce((sum, item) => sum + item.quantity, 0)
    , [cart]);

    const value = useMemo(() => ({
        cart,
        customerInfo,
        deliveryInfo,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        setCustomerInfo,
        setDeliveryInfo,
        subtotal,
        totalItems
    }), [cart, customerInfo, deliveryInfo, addItem, removeItem, updateQuantity, clearCart, setCustomerInfo, setDeliveryInfo, subtotal, totalItems]);

    return (
        <AdminCartContext.Provider value={value}>
            {children}
        </AdminCartContext.Provider>
    );
}

export function useAdminCart() {
    const context = useContext(AdminCartContext);
    if (context === undefined) {
        throw new Error('useAdminCart must be used within an AdminCartProvider');
    }
    return context;
}
