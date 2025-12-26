'use client';

import React from 'react';
import Link from 'next/link';
import { Package, ChevronRight } from 'lucide-react';
import styles from './ActiveOrderCard.module.css';

interface ActiveOrderCardProps {
    orderId: string;
    status: string;
}

export default function ActiveOrderCard({ orderId, status }: ActiveOrderCardProps) {
    return (
        <div className={styles.container}>
            <div className={styles.iconWrapper}>
                <Package size={24} />
            </div>
            <div className={styles.content}>
                <div className={styles.header}>
                    <span className={styles.label}>Faol buyurtma</span>
                    <span className={styles.status}>{status}</span>
                </div>
                <div className={styles.miniProgress}>
                    <div className={styles.activeBar} style={{ width: '60%' }}></div>
                </div>
                <span className={styles.orderId}>{orderId}</span>
            </div>
            <Link href={`/profil/buyurtmalar/${orderId}`} className={styles.link}>
                <span>Kuzatish</span>
                <ChevronRight size={20} />
            </Link>
        </div>
    );
}
