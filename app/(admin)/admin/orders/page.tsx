import { Suspense } from 'react';
import OrdersPageContent from './OrdersPageContent';
import OrdersPageFallback from './OrdersPageFallback';

export default function AdminOrdersPage() {
    return (
        <Suspense fallback={<OrdersPageFallback />}>
            <OrdersPageContent />
        </Suspense>
    );
}
