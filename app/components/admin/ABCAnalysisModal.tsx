'use client';

import React, { useMemo } from 'react';
import { X, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import styles from './ABCAnalysisModal.module.css';

interface ProductStat {
    name: string;
    quantity: number;
    revenue: number;
}

interface ABCAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: ProductStat[];
}

export default function ABCAnalysisModal({ isOpen, onClose, data }: ABCAnalysisModalProps) {
    const { lang, t } = useAdminI18n();
    const analysis = useMemo(() => {
        if (!data || data.length === 0) return [];

        // 1. Sort by revenue descending
        const sorted = [...data].sort((a, b) => b.revenue - a.revenue);

        // 2. Calculate total revenue
        const totalRevenue = sorted.reduce((sum, item) => sum + item.revenue, 0);

        let cumulativeRevenue = 0;

        // 3. Assign ABC categories
        return sorted.map((item) => {
            cumulativeRevenue += item.revenue;
            const cumulativeShare = (cumulativeRevenue / totalRevenue) * 100;
            const share = (item.revenue / totalRevenue) * 100;

            let group: 'A' | 'B' | 'C';
            if (cumulativeShare <= 80) {
                group = 'A';
            } else if (cumulativeShare <= 95) {
                group = 'B';
            } else {
                group = 'C';
            }

            return {
                ...item,
                share,
                cumulativeShare,
                group
            };
        });
    }, [data]);

    if (!isOpen) return null;

    const groupCounts = {
        A: analysis.filter(i => i.group === 'A').length,
        B: analysis.filter(i => i.group === 'B').length,
        C: analysis.filter(i => i.group === 'C').length
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>{t('abcAnalysisTitle')}</h2>
                        <p className={styles.subtitle}>{t('abcAnalysisSubtitle')}</p>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className={styles.summaryGrid}>
                    <div className={`${styles.summaryCard} ${styles.cardA}`}>
                        <div className={styles.groupLabel}>{t('groupA')}</div>
                        <div className={styles.groupCount}>{groupCounts.A} {t('countProducts')}</div>
                        <div className={styles.groupDesc}>{t('revenueShare80')}</div>
                    </div>
                    <div className={`${styles.summaryCard} ${styles.cardB}`}>
                        <div className={styles.groupLabel}>{t('groupB')}</div>
                        <div className={styles.groupCount}>{groupCounts.B} {t('countProducts')}</div>
                        <div className={styles.groupDesc}>{t('revenueShare15')}</div>
                    </div>
                    <div className={`${styles.summaryCard} ${styles.cardC}`}>
                        <div className={styles.groupLabel}>{t('groupC')}</div>
                        <div className={styles.groupCount}>{groupCounts.C} {t('countProducts')}</div>
                        <div className={styles.groupDesc}>{t('revenueShare5')}</div>
                    </div>
                </div>

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>{t('productNameCol')}</th>
                                <th>{t('quantityCol')}</th>
                                <th>{t('revenueCol')}</th>
                                <th>{t('shareCol')}</th>
                                <th>{t('groupCol')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {analysis.map((item, index) => (
                                <tr key={index}>
                                    <td>{index + 1}</td>
                                    <td className={styles.productName}>{item.name}</td>
                                    <td>{item.quantity} {t('pcs')}</td>
                                    <td className={styles.revenue}>{item.revenue.toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}</td>
                                    <td>
                                        <div className={styles.shareWrapper}>
                                            <span className={styles.shareNum}>{item.share.toFixed(1)}%</span>
                                            <div className={styles.shareBar}>
                                                <div
                                                    className={styles.shareFill}
                                                    style={{
                                                        width: `${item.share}%`,
                                                        backgroundColor: item.group === 'A' ? '#BE185D' : item.group === 'B' ? '#EC4899' : '#F9A8D4'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`${styles.badge} ${styles[`badge${item.group}`]}`}>
                                            {item.group}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className={styles.footer}>
                    <div className={styles.infoTip}>
                        <Info size={16} />
                        <span>{t('abcAAdvice')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
