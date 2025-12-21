import Link from 'next/link';
import { Heart, Plus } from 'lucide-react';
import styles from './ProductCard.module.css';

interface ProductProps {
    id: string;
    title: string;
    price: string;
    image: string; // In real app, this would be an Image URL
    tag?: string;
}

export default function ProductCard({ id, title, price, tag = 'Tayyor' }: ProductProps) {
    return (
        <Link href={`/mahsulot/${id}`} className={styles.card}>
            <div className={styles.imageContainer}>
                {/* Placeholder for image */}
                <div className={styles.placeholderImage} />

                <button className={styles.likeButton}>
                    <Heart size={18} />
                </button>

                {tag && <span className={styles.tag}>{tag}</span>}
            </div>

            <div className={styles.content}>
                <h3 className={styles.title}>{title}</h3>
                <div className={styles.bottomRow}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <p className={styles.price}>{price}</p>
                        <p className={styles.subText}>dan boshlab</p>
                    </div>

                    <button className={styles.addButton}>
                        <Plus size={20} color="white" />
                    </button>
                </div>
            </div>
        </Link>
    );
}
