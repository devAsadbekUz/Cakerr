import { Suspense } from 'react';
import ProductsClient from './ProductsClient';
import { productService } from '@/app/services/productService';
import { createClient } from '@/app/utils/supabase/server';
import DashboardPageFallback from '../DashboardPageFallback';

export const metadata = {
    title: 'Mahsulotlar boshqaruvi | Cakerr',
    robots: { index: false, follow: false },
};

async function getProductsData() {
    const supabase = await createClient();
    
    const [productsRaw, categoriesRes] = await Promise.all([
        productService.getAllProductsAdmin(),
        supabase.from('categories').select('*').order('id', { ascending: true })
    ]);

    // Filter out the system placeholder product (Custom Cake)
    const products = (productsRaw || []).filter(
        p => p.id !== '00000000-0000-0000-0000-000000000000'
    );

    return {
        products,
        categories: categoriesRes.data || []
    };
}

export default async function ProductsContainer() {
    return (
        <Suspense fallback={<DashboardPageFallback />}>
            <ProductsPage />
        </Suspense>
    );
}

async function ProductsPage() {
    const { products, categories } = await getProductsData();

    return <ProductsClient initialProducts={products} categories={categories} />;
}
