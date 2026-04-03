import AdminDashboardClient from './AdminDashboardClient';
import { fetchAdminDashboardData } from './dashboard-data';

export default async function DashboardPageContent() {
    const data = await fetchAdminDashboardData(30);

    return <AdminDashboardClient initialData={data} />;
}
