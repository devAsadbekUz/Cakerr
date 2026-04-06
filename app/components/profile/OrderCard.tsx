import React from 'react';
import styles from './OrderCard.module.css';
import { RotateCw } from 'lucide-react';
import { useCartActions } from '@/app/context/CartContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useLanguage } from '@/app/context/LanguageContext';

interface OrderCardProps {
    id: string;
    date: string;
    items: string;
    price: number;
    image: string;
    productId?: string;
    name?: string;
    portion?: string;
    flavor?: string;
}

export default function OrderCard({ date, items, price, image, productId, name, portion, flavor }: OrderCardProps) {
    const { addItem } = useCartActions();
    const router = useRouter();
    const { t } = useLanguage();

    const handleReorder = () => {
        addItem({
            id: productId || 'b1',
            name: name || items,
            price: price,
            image: image,
            portion: portion || '',
            flavor: flavor || 'Klassik',
            quantity: 1
        });
        router.push('/savat');
    };
    return (
        <div className={styles.card}>
            <div className={styles.content}>
                <Image src={image || '/images/cake-placeholder.jpg'} alt="Order item" className={styles.image} width={64} height={64} />
                <div className={styles.info}>
                    <p className={styles.date}>{date}</p>
                    <h4 className={styles.items}>{items}</h4>
                    <p className={styles.price}>{price.toLocaleString('uz-UZ')} so'm</p>
                </div>
            </div>
            <button className={styles.reorderBtn} onClick={handleReorder}>
                <RotateCw size={16} />
                <span>{t('reorderShort')}</span>
            </button>
        </div>
    );
}
