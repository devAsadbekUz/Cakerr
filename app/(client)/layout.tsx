import { CartProvider } from '@/app/context/CartContext';
import { FavoritesProvider } from '@/app/context/FavoritesContext';
import { TelegramProvider } from '@/app/context/TelegramContext';
import BottomNav from "../components/layout/BottomNav";
import ChatWidget from "../components/chat/ChatWidget";

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <TelegramProvider>
            <FavoritesProvider>
                <CartProvider>
                    <div style={{ paddingBottom: '70px' }}>
                        {children}
                    </div>
                    <BottomNav />
                    <ChatWidget />
                </CartProvider>
            </FavoritesProvider>
        </TelegramProvider>
    );
}
