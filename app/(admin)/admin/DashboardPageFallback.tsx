import styles from './AdminDashboard.module.css';

function SkeletonBlock({ width, height, radius = 12 }: { width: string; height: number; radius?: number }) {
    return (
        <div
            style={{
                width,
                height,
                borderRadius: radius,
                background: 'linear-gradient(90deg, #F3F4F6 0%, #E5E7EB 50%, #F3F4F6 100%)',
                backgroundSize: '200% 100%',
                animation: 'dashboard-skeleton 1.4s ease-in-out infinite'
            }}
        />
    );
}

export default function DashboardPageFallback() {
    return (
        <div className={styles.container}>
            <style>{`
                @keyframes dashboard-skeleton {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>

            <header className={styles.header}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <SkeletonBlock width="220px" height={34} />
                    <SkeletonBlock width="320px" height={16} radius={999} />
                </div>
                <div className={styles.filterBar} style={{ marginBottom: 0 }}>
                    <SkeletonBlock width="72px" height={36} radius={10} />
                    <SkeletonBlock width="72px" height={36} radius={10} />
                    <SkeletonBlock width="72px" height={36} radius={10} />
                    <SkeletonBlock width="72px" height={36} radius={10} />
                </div>
            </header>

            <div className={styles.statsGrid}>
                {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className={styles.statCard}>
                        <div className={styles.statCardIcon}>
                            <SkeletonBlock width="24px" height={24} radius={8} />
                        </div>
                        <div className={styles.statCardInfo}>
                            <SkeletonBlock width="90px" height={12} radius={999} />
                            <div style={{ height: 8 }} />
                            <SkeletonBlock width="70px" height={24} radius={999} />
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.analyticsLayout} style={{ marginBottom: '32px' }}>
                <div className={styles.chartCard}>
                    <SkeletonBlock width="220px" height={22} radius={999} />
                    <div style={{ height: 24 }} />
                    <SkeletonBlock width="100%" height={280} radius={24} />
                </div>
            </div>

            <div className={styles.analyticsLayout}>
                <div className={styles.chartCard}>
                    <SkeletonBlock width="180px" height={22} radius={999} />
                    <div style={{ height: 24 }} />
                    <SkeletonBlock width="100%" height={240} radius={24} />
                </div>
                <div className={styles.recentActivity}>
                    <SkeletonBlock width="160px" height={22} radius={999} />
                    <div style={{ height: 24 }} />
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {Array.from({ length: 4 }).map((_, idx) => (
                            <SkeletonBlock key={idx} width="100%" height={72} radius={16} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
