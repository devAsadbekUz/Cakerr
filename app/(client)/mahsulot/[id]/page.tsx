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
import { createClient } from '@/app/utils/supabase/client';
import React from 'react';
import { Product, Variant } from '@/app/types';
import { flyToCart } from '@/app/utils/animations';

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
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [portion, setPortion] = useState<string>('');
  const [localQuantity, setLocalQuantity] = useState(1);
  const supabase = createClient();

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
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
        name: product.title,
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
        removeItem(cartItem.cartId); // remove completely
        setLocalQuantity(1); // reset local prep state
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
        name: product.title,
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
      title: product.title,
      text: product.subtitle || `${product.title} - Cakerr`,
      url: window.location.href
    };

    try {
      // Try native share API first (works on mobile and modern browsers)
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        // Show a simple alert as toast (you can replace with a proper toast component)
        const toast = document.createElement('div');
        toast.textContent = 'Havola nusxalandi!';
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
      {/* Top Navigation Overlay */}
      <div className={styles.navOverlay}>
        <Link href="/" className={styles.iconBtn}>
          <ArrowLeft size={24} color="#1F2937" />
        </Link>
      </div>

      <div className={styles.imageSection}>
        <Image
          src={product.image}
          alt={product.title}
          className={styles.productImage}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          style={{ objectFit: 'cover' }}
        />

        {product.is_ready && (
          <span className={styles.tag}>
            <span style={{ marginRight: '6px' }}>✓</span> Tayyor
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
        {product.details?.shapes && product.details.shapes.length > 0 && (
          <Section title="Shakl">
            {product.details.shapes.map((t: string) => <Chip key={t} label={t} color="green" />)}
          </Section>
        )}

        {product.details?.flavors && product.details.flavors.length > 0 && (
          <Section title="Ichki ta'mlar">
            {product.details.flavors.map((t: string) => <Chip key={t} label={t} color="pink" />)}
          </Section>
        )}

        {product.details?.coating && product.details.coating.length > 0 && (
          <Section title="Ustki qoplama">
            {product.details.coating.map((t: string) => <Chip key={t} label={t} color="blue" />)}
          </Section>
        )}


        {product.details?.innerCoating && (
          <Section title="Ichki qoplama">
            {product.details.innerCoating.map((t: string) => <Chip key={t} label={t} color="orange" />)}
          </Section>
        )}

        {product.details?.decorations && (
          <Section title="Bezaklar">
            {product.details.decorations.map((t: string) => <Chip key={t} label={t} color="purple" />)}
          </Section>
        )}

        {/* Dynamic Description from Admin/DB */}
        {product.description && (
          <div className={styles.descriptionText}>
            <h3 className={styles.sectionTitle} style={{ marginBottom: '8px' }}>Tavsif</h3>
            {product.description}
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

        {/* Spacer for bottom bar */}
        <div style={{ height: '100px' }} />
      </div>

      <BottomAction
        price={currentPrice}
        quantity={displayQuantity}
        isAdded={isAdded}
        onIncrement={handleIncrement}
        onDecrement={handleDecrement}
        onMainAction={handleMainAction}
      />
    </div>
  );
}
