'use client';

import { Package, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useRouter } from 'next/navigation';
import styles from './ActiveOrderCard.module.css';

interface ActiveOrderCardProps {
    orderId: string;
    itemName: string;
    status: string;
    progress?: number; // Added progress percentage
}

export default function ActiveOrderCard({ orderId, itemName, status, progress }: ActiveOrderCardProps) {
    const { t } = useLanguage();
    const router = useRouter();
    return (
        <div className={styles.container}>
            <div className={styles.iconWrapper}>
                <Package size={22} />
            </div>
            <div className={styles.content}>
                <div className={styles.header}>
                    <span className={styles.label}>{t('activeOrder')}</span>
                    <div className={styles.infoRow}>
                        <span className={styles.statusLabel}>{t('status')}:</span>
                        <span className={styles.statusValue}>{status}</span>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.itemLabel}>{t('mahsulot')}:</span>
                        <span className={styles.itemName}>{itemName}</span>
                    </div>

                    {/* Mini Progress Bar */}
                    <div className={styles.progressContainer}>
                        <div className={styles.progressBar}>
                            <div
                                className={styles.progressFill}
                                style={{ width: `${progress || 0}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
            <button
                onClick={() => router.push(`/profil/buyurtmalar/${orderId}`)}
                className={styles.link}
                style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
            >
                <span>{t('track')}</span>
                <ChevronRight size={16} />
            </button>
        </div>
    );
}
