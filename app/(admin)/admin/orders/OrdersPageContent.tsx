import AdminOrdersClient from './AdminOrdersClient';
import { fetchAdminOrderSummaries } from './orders-data';

const INITIAL_ORDERS_LIMIT = 30;

export default async function OrdersPageContent() {
    const initialOrders = await fetchAdminOrderSummaries(60, INITIAL_ORDERS_LIMIT);

    return <AdminOrdersClient initialOrders={initialOrders} />;
}
