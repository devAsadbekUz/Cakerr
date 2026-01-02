import { CartProvider } from '@/app/context/CartContext';
import { FavoritesProvider } from '@/app/context/FavoritesContext';
import SupabaseProvider from '@/app/context/SupabaseContext';
import BottomNav from "../components/layout/BottomNav";

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SupabaseProvider>
            <FavoritesProvider>
                <CartProvider>
                    <div style={{ paddingBottom: '70px' }}>
                        {children}
                    </div>
                    <BottomNav />
                </CartProvider>
            </FavoritesProvider>
        </SupabaseProvider>
    );
}
