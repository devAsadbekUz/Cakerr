'use client';

import dynamic from 'next/dynamic';
import { CartProvider } from '@/app/context/CartContext';
import { FavoritesProvider } from '@/app/context/FavoritesContext';
import BottomNav from "../components/layout/BottomNav";

const ChatWidget = dynamic(() => import("../components/chat/ChatWidget"), {
    ssr: false,
});

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <FavoritesProvider>
            <CartProvider>
                <div style={{ paddingBottom: '70px' }}>
                    {children}
                </div>
                <BottomNav />
                <ChatWidget />
            </CartProvider>
        </FavoritesProvider>
    );
}
