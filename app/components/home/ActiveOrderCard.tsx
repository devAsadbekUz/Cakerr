'use client';

import React from 'react';
import Link from 'next/link';
import { Package, ChevronRight } from 'lucide-react';
import styles from './ActiveOrderCard.module.css';

interface ActiveOrderCardProps {
    orderId: string;
    itemName: string;
    status: string;
}

export default function ActiveOrderCard({ orderId, itemName, status }: ActiveOrderCardProps) {
    return (
        <div className={styles.container}>
            <div className={styles.iconWrapper}>
                <Package size={22} />
            </div>
            <div className={styles.content}>
                <div className={styles.header}>
                    <span className={styles.label}>Faol buyurtma</span>
                    <div className={styles.infoRow}>
                        <span className={styles.statusLabel}>Holati:</span>
                        <span className={styles.statusValue}>{status}</span>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.itemLabel}>Mahsulot:</span>
                        <span className={styles.itemName}>{itemName}</span>
                    </div>
                </div>
            </div>
            <Link href={`/profil/buyurtmalar/${orderId}`} className={styles.link}>
                <span>Kuzatish</span>
                <ChevronRight size={16} />
            </Link>
        </div>
    );
}
