'use client';

import { useState } from 'react';
import styles from './OrderCard.module.css';
import { RotateCw, Loader2 } from 'lucide-react';
import { useCart, ReorderItem } from '@/app/context/CartContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useLanguage } from '@/app/context/LanguageContext';

interface OrderCardProps {
    id: string;
    date: string;
    displayName: string;
    extraItemsCount: number;
    price: number;
    image: string;
    orderItems: ReorderItem[];
}

export default function OrderCard({ date, displayName, extraItemsCount, price, image, orderItems }: OrderCardProps) {
    const { reorderFromHistory } = useCart();
    const router = useRouter();
    const { t } = useLanguage();
    const [isLoading, setIsLoading] = useState(false);

    const handleReorder = async () => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            await reorderFromHistory(orderItems);
            router.push('/savat');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.card}>
            <div className={styles.content}>
                <Image src={image || '/images/cake-placeholder.jpg'} alt="Order item" className={styles.image} width={64} height={64} />
                <div className={styles.info}>
                    <p className={styles.date}>{date}</p>
                    <h4 className={styles.items}>
                        {displayName}
                        {extraItemsCount > 0 && <span className={styles.extraItems}> +{extraItemsCount}</span>}
                    </h4>
                    <p className={styles.price}>{price.toLocaleString('uz-UZ')} so'm</p>
                </div>
            </div>
            <button className={styles.reorderBtn} onClick={handleReorder} disabled={isLoading}>
                {isLoading
                    ? <Loader2 size={16} className={styles.spinning} />
                    : <RotateCw size={16} />
                }
                <span>{t('reorderShort')}</span>
            </button>
        </div>
    );
}
