import { createClient } from '@/app/utils/supabase/server';
import { notFound } from 'next/navigation';
import { Product, Variant } from '@/app/types';
import ProductDetailsClient from './ProductDetailsClient';

export default async function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('products')
    .select('id, title, subtitle, description, category, category_id, base_price, image_url, images, is_available, is_ready, variants, details')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (!data || error) notFound();

  const product: Product = {
    id: data.id,
    title: data.title,
    subtitle: data.subtitle,
    description: data.description,
    category: data.category,
    category_id: data.category_id,
    base_price: data.base_price,
    price: data.base_price,
    image_url: data.image_url,
    image: data.image_url,
    images: Array.isArray(data.images) ? data.images : (data.image_url ? [data.image_url] : []),
    is_available: data.is_available ?? true,
    is_ready: data.is_ready ?? false,
    variants: (Array.isArray(data.variants) ? data.variants : []) as Variant[],
    details: data.details || {}
  };

  return <ProductDetailsClient product={product} />;
}
