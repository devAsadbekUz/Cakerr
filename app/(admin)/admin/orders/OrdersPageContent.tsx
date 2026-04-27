import AdminOrdersClient from './AdminOrdersClient';
import { fetchAdminOrderSummaries } from './orders-data';
import { ORDERS_FILTER_DAYS } from './orders-config';

const INITIAL_ORDERS_LIMIT = 100;

export default async function OrdersPageContent() {
    const initialOrders = await fetchAdminOrderSummaries(ORDERS_FILTER_DAYS, INITIAL_ORDERS_LIMIT);

    return <AdminOrdersClient initialOrders={initialOrders} />;
}
