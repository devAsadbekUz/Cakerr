import { Suspense } from 'react';
import DashboardPageContent from './DashboardPageContent';
import DashboardPageFallback from './DashboardPageFallback';

export default function AdminAnalyticsPage() {
    return (
        <Suspense fallback={<DashboardPageFallback />}>
            <DashboardPageContent />
        </Suspense>
    );
}
