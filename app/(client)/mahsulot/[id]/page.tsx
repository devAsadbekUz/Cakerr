'use client';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Heart, Share2, CircleAlert } from 'lucide-react';
import PortionSelector from '@/app/components/product-details/PortionSelector';
import BottomAction from '@/app/components/product-details/BottomAction';
import styles from './page.module.css';
import { useCart } from '@/app/context/CartContext';
import { useFavorites } from '@/app/context/FavoritesContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { getLocalized } from '@/app/utils/i18n';
import { createClient } from '@/app/utils/supabase/client';
import React from 'react';
import { Product, Variant } from '@/app/types';
import { flyToCart } from '@/app/utils/animations';
import ProductGallery from '@/app/components/products/ProductGallery';
import ConfirmDeleteModal from '@/app/components/cart/ConfirmDeleteModal';

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

function Chip({ label, color }: { label: string | { uz: string; ru: string }; color: string }) {
  const { lang } = useLanguage();
  return (
    <span className={`${styles.chip} ${styles[color]}`}>
      {getLocalized(label, lang)}
    </span>
  );
}

export default function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { lang, t } = useLanguage();
  const { id } = React.use(params);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [portion, setPortion] = useState<string>('');
  const [localQuantity, setLocalQuantity] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('id, title, subtitle, description, category, category_id, base_price, image_url, images, is_available, is_ready, variants, details')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (data && !error) {
        // Enforce type casting with validation if needed, but for now treating DB data as partial Product source
        const mappedProduct: Product = {
          id: data.id,
          title: data.title,
          subtitle: data.subtitle,
          description: data.description,
          category: data.category,
          category_id: data.category_id,
          base_price: data.base_price,
          price: data.base_price, // Default price
          image_url: data.image_url,
          image: data.image_url, // Map for UI consistency
          images: Array.isArray(data.images) ? data.images : (data.image_url ? [data.image_url] : []),
          is_available: data.is_available ?? true,
          is_ready: data.is_ready ?? false,
          variants: (Array.isArray(data.variants) ? data.variants : []) as Variant[],
          details: data.details || {}
        };
        setProduct(mappedProduct);

        if (mappedProduct.variants && mappedProduct.variants.length > 0) {
          setPortion(mappedProduct.variants[0].value);
        }
      }
      setLoading(false);
    }
    fetchProduct();
  }, [id]);

  const { addItem, cart, updateQuantity, removeItem } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();

  if (loading) return <div className={styles.container} style={{ padding: '100px', textAlign: 'center' }}>Yuklanmoqda...</div>;
  if (!product) return <div className={styles.container} style={{ padding: '100px', textAlign: 'center' }}>Mahsulot topilmadi</div>;

  const favorited = isFavorite(product.id);
  const selectedVariant = product.variants?.find((v: Variant) => v.value === portion) || product.variants?.[0];
  const currentPrice = selectedVariant?.price || product.price;

  // Find if variant is in cart
  const flavors = product?.details?.flavors;
  const firstFlavor = (Array.isArray(flavors) && flavors.length > 0) ? flavors[0] : 'Klassik';
  const cartItem = cart.find(
    (item) => item.id === product.id && item.portion === portion && item.flavor === firstFlavor
  );

  const isAdded = !!cartItem;
  const displayQuantity = isAdded ? cartItem.quantity : localQuantity;

  const handleIncrement = (e: React.MouseEvent) => {
    if (isAdded && cartItem) {
      updateQuantity(cartItem.cartId, cartItem.quantity + 1);
    } else {
      addItem({
        id: product.id,
        name: getLocalized(product.title, lang),
        price: currentPrice,
        image: product.image,
        quantity: localQuantity + 1,
        portion: portion,
        flavor: firstFlavor
      });
    }
    if (product?.image) flyToCart(e, product.image);
  };

  const handleDecrement = () => {
    if (isAdded && cartItem) {
      if (cartItem.quantity > 1) {
        updateQuantity(cartItem.cartId, cartItem.quantity - 1);
      } else {
        setShowDeleteConfirm(true);
      }
    } else {
      setLocalQuantity(prev => Math.max(1, prev - 1));
    }
  };

  const handleMainAction = (e: React.MouseEvent) => {
    if (isAdded) {
      router.push('/savat');
    } else {
      addItem({
        id: product.id,
        name: getLocalized(product.title, lang),
        price: currentPrice,
        image: product.image,
        quantity: localQuantity,
        portion: portion,
        flavor: firstFlavor
      });
      if (product?.image) flyToCart(e, product.image);
    }
  };

  const handleToggleFavorite = () => {
    toggleFavorite(product.id);
  };

  const handleShare = async () => {
    const shareData = {
      text: getLocalized(product.subtitle, lang) || `${getLocalized(product.title, lang)} - TORTEL'E`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        const toast = document.createElement('div');
        toast.textContent = t('linkCopied');
        toast.style.cssText = `
          position: fixed;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          background: #1F2937;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          z-index: 1000;
          animation: fadeInOut 2s forwards;
        `;

        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
          @keyframes fadeInOut {
            0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
            15% { opacity: 1; transform: translateX(-50%) translateY(0); }
            85% { opacity: 1; transform: translateX(-50%) translateY(0); }
            100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          }
        `;
        document.head.appendChild(style);
        document.body.appendChild(toast);

        // Remove toast after animation
        setTimeout(() => {
          toast.remove();
          style.remove();
        }, 2000);
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        {/* Top Navigation Overlay */}
        <div className={styles.navOverlay}>
          <Link href="/" className={styles.iconBtn}>
            <ArrowLeft size={24} color="#1F2937" />
          </Link>
        </div>

        <div className={styles.imageSection}>
          <ProductGallery 
            images={product.images} 
            title={product.title} 
          />

          {product.is_ready && (
            <span className={styles.tag}>
              <span style={{ marginRight: '6px' }}>✓</span> {t('tayyor')}
            </span>
          )}

          <div className={styles.imageActions}>
            <button className={styles.iconBtn} onClick={handleToggleFavorite} style={{ transition: 'all 0.2s active' }}>
              <Heart size={24} color={favorited ? "#E91E63" : "#1F2937"} fill={favorited ? "#E91E63" : "none"} />
            </button>
            <button className={styles.iconBtn} onClick={handleShare}>
              <Share2 size={24} color="#1F2937" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <h1 className={styles.title}>{getLocalized(product.title, lang)}</h1>
          <p className={styles.subtitle}>{getLocalized(product.subtitle, lang) || t('defaultSubtitle')}</p>

          {/* Info Alert */}
          <div className={styles.alert}>
            <CircleAlert size={20} color="#15803D" className={styles.alertIcon} />
            <p className={styles.alertText}>
              {getLocalized(product.description, lang) || t('defaultDescription')}
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
          {product.details?.shapes && product.details.shapes.length > 0 && (
            <Section title={t('shapes')}>
              {product.details.shapes.map((t: any) => <Chip key={typeof t === 'string' ? t : t.uz} label={t} color="green" />)}
            </Section>
          )}

          {product.details?.flavors && product.details.flavors.length > 0 && (
            <Section title={t('flavors')}>
              {product.details.flavors.map((t: any) => <Chip key={typeof t === 'string' ? t : t.uz} label={t} color="pink" />)}
            </Section>
          )}

          {product.details?.coating && product.details.coating.length > 0 && (
            <Section title={t('coating')}>
              {product.details.coating.map((t: any) => <Chip key={typeof t === 'string' ? t : t.uz} label={t} color="blue" />)}
            </Section>
          )}


          {product.details?.innerCoating && (
            <Section title={t('innerCoating')}>
              {product.details.innerCoating.map((t: any) => <Chip key={typeof t === 'string' ? t : t.uz} label={t} color="orange" />)}
            </Section>
          )}

          {product.details?.decorations && (
            <Section title={t('decorations')}>
              {product.details.decorations.map((t: any) => <Chip key={typeof t === 'string' ? t : t.uz} label={t} color="purple" />)}
            </Section>
          )}

          {/* Dynamic Description from Admin/DB */}
          {product.description && (
            <div className={styles.descriptionText}>
              <h3 className={styles.sectionTitle} style={{ marginBottom: '8px' }}>{t('description')}</h3>
              {getLocalized(product.description, lang)}
            </div>
          )}

          <BottomAction
            price={currentPrice}
            quantity={displayQuantity}
            isAdded={isAdded}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onMainAction={handleMainAction}
            inline={true}
          />

          {/* Spacer for bottom bar (mobile only) */}
          <div style={{ height: '100px' }} className="mobile-only-spacer" />
        </div>
      </div>

      <BottomAction
        price={currentPrice}
        quantity={displayQuantity}
        isAdded={isAdded}
        onIncrement={handleIncrement}
        onDecrement={handleDecrement}
        onMainAction={handleMainAction}
      />

      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null as any)} // will be handled by boolean state
        onConfirm={() => {
          if (cartItem) {
            removeItem(cartItem.cartId);
            setLocalQuantity(1);
          }
          setShowDeleteConfirm(false);
        }}
        itemName={getLocalized(product.title, lang)}
      />
    </div>
  );
}
