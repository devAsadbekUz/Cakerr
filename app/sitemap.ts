import { MetadataRoute } from 'next';
import { createClient } from '@/app/utils/supabase/server';
import { getConfiguredAppUrl } from '@/app/utils/appUrl';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = getConfiguredAppUrl() || 'https://tortele.uz';
    const supabase = await createClient();

    // 1. Static Routes
    const routes = [
        '',
        '/savat',
        '/profil',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: route === '' ? 1 : 0.8,
    }));

    // 2. Product Routes
    try {
        const { data: products } = await supabase
            .from('products')
            .select('id, updated_at')
            .is('deleted_at', null);

        const productRoutes = (products || []).map((product) => ({
            url: `${baseUrl}/mahsulot/${product.id}`,
            lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.6,
        }));

        return [...routes, ...productRoutes];
    } catch (error) {
        console.error('Sitemap generation error:', error);
        return routes;
    }
}
