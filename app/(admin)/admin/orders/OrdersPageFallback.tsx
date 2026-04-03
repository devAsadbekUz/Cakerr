import { ShoppingBag, Calendar as CalendarIcon, Clock } from 'lucide-react';
import styles from '../AdminDashboard.module.css';

function SkeletonLine({ width, height = 16 }: { width: string; height?: number }) {
    return (
        <div
            style={{
                width,
                height,
                borderRadius: '999px',
                background: 'linear-gradient(90deg, #F3F4F6 0%, #E5E7EB 50%, #F3F4F6 100%)',
                backgroundSize: '200% 100%',
                animation: 'orders-skeleton 1.4s ease-in-out infinite'
            }}
        />
    );
}

function SkeletonCard({ compact = false }: { compact?: boolean }) {
    return (
        <div
            style={{
                background: 'white',
                borderRadius: '24px',
                border: '1px solid #E5E7EB',
                padding: '20px',
                minHeight: compact ? '160px' : '260px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                    <SkeletonLine width="120px" />
                    <SkeletonLine width="150px" height={14} />
                    <SkeletonLine width="100px" height={12} />
                </div>
                <SkeletonLine width="72px" height={20} />
            </div>
            {!compact && (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <SkeletonLine width="140px" height={14} />
                        <SkeletonLine width="85%" height={12} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <SkeletonLine width="52px" height={12} />
                        <SkeletonLine width="78%" height={12} />
                        <SkeletonLine width="66%" height={12} />
                    </div>
                </>
            )}
            <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
                <SkeletonLine width="100%" height={44} />
                {!compact && <SkeletonLine width="44px" height={44} />}
            </div>
        </div>
    );
}

export default function OrdersPageFallback() {
    return (
        <div className={styles.container}>
            <style>{`
                @keyframes orders-skeleton {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>

            <header className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <SkeletonLine width="180px" height={34} />
                    <button className={styles.modalClose} style={{ width: '40px', height: '40px', background: 'white' }}>
                        <Clock size={20} color="#D1D5DB" />
                    </button>
                </div>
                <div className={styles.viewToggle}>
                    <div className={`${styles.toggleBtn} ${styles.toggleBtnActive}`}>
                        <ShoppingBag size={18} /> <SkeletonLine width="56px" height={14} />
                    </div>
                    <div className={styles.toggleBtn}>
                        <CalendarIcon size={18} /> <SkeletonLine width="68px" height={14} />
                    </div>
                </div>
            </header>

            <div className={styles.inboxView}>
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <SkeletonLine width="180px" height={24} />
                        <SkeletonLine width="28px" height={20} />
                    </div>
                    <div className={styles.orderGrid}>
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </div>
                </section>

                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <SkeletonLine width="140px" height={24} />
                        <SkeletonLine width="24px" height={20} />
                    </div>
                    <div className={styles.orderGrid}>
                        <SkeletonCard compact />
                        <SkeletonCard compact />
                    </div>
                </section>
            </div>
        </div>
    );
}
