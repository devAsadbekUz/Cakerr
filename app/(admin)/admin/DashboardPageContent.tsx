import AdminDashboardClient from './AdminDashboardClient';
import { fetchAdminDashboardData } from './dashboard-data';

export default async function DashboardPageContent({ 
    filterDays 
}: { 
    filterDays: number | null 
}) {
    const data = await fetchAdminDashboardData(filterDays);

    return <AdminDashboardClient initialData={data} />;
}
