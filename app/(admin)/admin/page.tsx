import { Suspense } from 'react';
import DashboardPageContent from './DashboardPageContent';
import DashboardPageFallback from './DashboardPageFallback';

export default async function AdminAnalyticsPage({ 
    searchParams 
}: { 
    searchParams: Promise<{ days?: string }> 
}) {
    const { days } = await searchParams;
    const filterDays = days === 'all' ? null : (parseInt(days || '30') || 30);

    return (
        <Suspense key={days || '30'} fallback={<DashboardPageFallback />}>
            <DashboardPageContent filterDays={filterDays} />
        </Suspense>
    );
}
