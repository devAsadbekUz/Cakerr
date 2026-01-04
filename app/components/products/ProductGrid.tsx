'use client';

import ProductCard from './ProductCard';
import { Product } from '@/app/types';
import styles from './ProductGrid.module.css';

interface ProductGridProps {
    products: Product[];
}

export default function ProductGrid({ products }: ProductGridProps) {
    return (
        <div className={styles.productGridMain}>
            {products.map(product => (
                <ProductCard
                    key={product.id}
                    id={product.id}
                    title={product.title}
                    price={product.price}
                    image={product.image}
                    isReady={product.is_ready}
                    variants={product.variants}
                />
            ))}
        </div>
    );
}
