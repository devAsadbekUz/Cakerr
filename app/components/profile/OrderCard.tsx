import React from 'react';
import styles from './OrderCard.module.css';
import { RotateCw } from 'lucide-react';
import { useCart } from '@/app/context/CartContext';
import { useRouter } from 'next/navigation';

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
    onClick?: () => void;
}

export default function OrderCard({ id, date, items, price, image, productId, name, portion, flavor, onClick }: OrderCardProps) {
    const { addItem } = useCart();
    const router = useRouter();

    const handleReorder = () => {
        addItem({
            id: productId || 'b1',
            name: name || items,
            price: price,
            image: image,
            portion: portion || '2',
            flavor: flavor || 'Klassik',
            quantity: 1
        });
        router.push('/savat');
    };

    const handleCardClick = () => {
        if (onClick) {
            onClick();
        } else {
            // Navigate to order details
            router.push(`/profil/buyurtmalar/ORD-${id}`);
        }
    };

    return (
        <div className={styles.card} onClick={handleCardClick} style={{ cursor: 'pointer' }}>
            <div className={styles.content}>
                <img src={image} alt="Order item" className={styles.image} />
                <div className={styles.info}>
                    <p className={styles.date}>{date}</p>
                    <h4 className={styles.items}>{items}</h4>
                    <p className={styles.price}>{price.toLocaleString('uz-UZ')} so'm</p>
                </div>
            </div>
            <button
                className={styles.reorderBtn}
                onClick={(e) => {
                    e.stopPropagation();
                    handleReorder();
                }}
            >
                <RotateCw size={16} />
                <span>Qayta buyurtma</span>
            </button>
        </div>
    );
}
