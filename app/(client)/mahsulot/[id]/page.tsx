import { createClient } from '@/app/utils/supabase/server';
import { notFound } from 'next/navigation';
import { Product, Variant } from '@/app/types';
import ProductDetailsClient from './ProductDetailsClient';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const supabase = await createClient();

    const { data } = await supabase
        .from('products')
        .select('title, subtitle, description, image_url')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

    if (!data) return { title: "TORTEL'E" };

    const title = `${data.title} | TORTEL'E`;
    const description = data.subtitle || data.description || "Eng mazali va sifatli tortlar hamda shirinliklar";
    const imageUrl = data.image_url;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: imageUrl ? [{ url: imageUrl }] : undefined,
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: imageUrl ? [imageUrl] : undefined,
        },
    };
}

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
