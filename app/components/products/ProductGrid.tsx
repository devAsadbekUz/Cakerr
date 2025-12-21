import ProductCard from './ProductCard';
import { Product } from '@/app/lib/mockData';

interface ProductGridProps {
    products: Product[];
}

export default function ProductGrid({ products }: ProductGridProps) {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px'
        }}>
            {products.map(product => (
                <ProductCard
                    key={product.id}
                    id={product.id}
                    title={product.title}
                    price={product.price}
                    image={product.image}
                    tag="Tayyor"
                    variants={product.variants}
                />
            ))}
        </div>
    );
}
