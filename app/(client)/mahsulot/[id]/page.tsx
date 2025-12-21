'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Heart, Share2, CircleAlert } from 'lucide-react';
import PortionSelector from '@/app/components/product-details/PortionSelector';
import BottomAction from '@/app/components/product-details/BottomAction';
import styles from './page.module.css';
import { useCart } from '@/app/context/CartContext';
import { useFavorites } from '@/app/context/FavoritesContext';
import { MOCK_PRODUCTS } from '@/app/lib/mockData';
import React from 'react';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.chipsRow}>
        {children}
      </div>
    </div>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span className={`${styles.chip} ${styles[color]}`}>
      {label}
    </span>
  );
}

export default function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const product = MOCK_PRODUCTS.find(p => p.id === id) || MOCK_PRODUCTS[0];

  const [portion, setPortion] = useState<string>('2');
  const { addItem } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const favorited = isFavorite(product.id);

  const selectedVariant = product.variants?.find(v => v.value === portion) || product.variants?.[0];
  const currentPrice = selectedVariant?.price || product.price;

  const handleAddToCart = (quantity: number) => {
    addItem({
      id: product.id,
      name: product.title,
      price: currentPrice,
      image: product.image,
      quantity,
      portion: portion,
      flavor: product.details?.flavors[0] || 'Klassik'
    });
  };

  const handleToggleFavorite = () => {
    toggleFavorite(product.id);
  };

  return (
    <div className={styles.container}>
      {/* Top Navigation Overlay */}
      <div className={styles.navOverlay}>
        <Link href="/" className={styles.iconBtn}>
          <ArrowLeft size={24} color="#1F2937" />
        </Link>
      </div>

      {/* Main Image */}
      <div className={styles.imageSection}>
        <div className={styles.placeholderImage} style={{ backgroundImage: `url(${product.image})`, backgroundSize: 'cover' }} />

        <span className={styles.tag}>
          <span style={{ marginRight: '6px' }}>✓</span> Tayyor
        </span>

        <div className={styles.imageActions}>
          <button className={styles.iconBtn} onClick={handleToggleFavorite} style={{ transition: 'all 0.2s active' }}>
            <Heart size={24} color={favorited ? "#E91E63" : "#1F2937"} fill={favorited ? "#E91E63" : "none"} />
          </button>
          <button className={styles.iconBtn}>
            <Share2 size={24} color="#1F2937" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <h1 className={styles.title}>{product.title}</h1>
        <p className={styles.subtitle}>{product.subtitle || 'Mazali va yangi tayyorlangan tort'}</p>

        {/* Info Alert */}
        <div className={styles.alert}>
          <CircleAlert size={20} color="#15803D" className={styles.alertIcon} />
          <p className={styles.alertText}>
            {product.description || 'Bu tayyor tort. Siz faqat porsiya miqdorini tanlaysiz va buyurtma berasiz!'}
          </p>
        </div>

        {/* Portions */}
        <PortionSelector
          selected={portion}
          onSelect={setPortion}
          options={product.variants}
        />

        <div className={styles.divider} />

        {/* Details Sections */}
        {product.details?.shapes && (
          <Section title="Shakl">
            {product.details.shapes.map(t => <Chip key={t} label={t} color="green" />)}
          </Section>
        )}

        {product.details?.flavors && (
          <Section title="Ichki ta'mlar">
            {product.details.flavors.map(t => <Chip key={t} label={t} color="pink" />)}
          </Section>
        )}

        {product.details?.coating && (
          <Section title="Qoplama turi">
            {product.details.coating.map(t => <Chip key={t} label={t} color="blue" />)}
          </Section>
        )}

        {product.details?.innerCoating && (
          <Section title="Ichki qoplama">
            {product.details.innerCoating.map(t => <Chip key={t} label={t} color="orange" />)}
          </Section>
        )}

        {product.details?.decorations && (
          <Section title="Bezaklar">
            {product.details.decorations.map(t => <Chip key={t} label={t} color="purple" />)}
          </Section>
        )}

        <BottomAction
          price={currentPrice}
          onAdd={handleAddToCart}
          inline={true}
        />

        {/* Spacer for bottom bar */}
        <div style={{ height: '100px' }} />
      </div>

      {/* Bottom Action */}
      <BottomAction price={currentPrice} onAdd={handleAddToCart} />
    </div>
  );
}
