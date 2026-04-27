import AdminOrdersClient from './AdminOrdersClient';
import { fetchAdminOrderSummaries } from './orders-data';
import { ORDERS_FILTER_DAYS } from './orders-config';

const INITIAL_ORDERS_LIMIT = 200;

export default async function OrdersPageContent() {
    // For the Inbox, we want ONLY active orders. 
    // We set filterDays to null (no age limit) because active orders should never be hidden by age.
    const initialOrders = await fetchAdminOrderSummaries(null, INITIAL_ORDERS_LIMIT, 'active');

    return <AdminOrdersClient initialOrders={initialOrders} />;
}
