'use client';

import React, { useMemo } from 'react';
import ProductCard from './ProductCard';
import { Product } from '@/app/types';
import styles from './ProductGrid.module.css';
import { useSearch } from '../home/HomepageShell';

interface ProductGridProps {
    products: Product[];
    searchTerm?: string;
    priorityCount?: number;
}

export default function ProductGrid({ products, searchTerm: propSearchTerm, priorityCount = 0 }: ProductGridProps) {
    const { searchTerm: contextSearchTerm } = useSearch();
    const activeSearchTerm = propSearchTerm !== undefined ? propSearchTerm : contextSearchTerm;

    const filteredProducts = useMemo(() => {
        if (!activeSearchTerm) return products;
        const term = activeSearchTerm.toLowerCase();
        return products.filter(product => 
            product.title.toLowerCase().includes(term) || 
            product.subtitle?.toLowerCase().includes(term)
        );
    }, [products, activeSearchTerm]);

    if (filteredProducts.length === 0) return null;

    return (
        <div className={styles.productGridMain}>
            {filteredProducts.map((product, index) => (
                <ProductCard
                    key={product.id}
                    id={product.id}
                    title={product.title}
                    price={product.price}
                    image={product.image}
                    isReady={product.is_ready}
                    variants={product.variants}
                    priority={index < priorityCount}
                />
            ))}
        </div>
    );
}
