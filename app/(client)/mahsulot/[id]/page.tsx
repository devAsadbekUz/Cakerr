'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Heart, Share2, CircleAlert } from 'lucide-react';
import PortionSelector from '@/app/components/product-details/PortionSelector';
import BottomAction from '@/app/components/product-details/BottomAction';
import styles from './page.module.css';

export default function ProductDetailsPage({ params }: { params: { id: string } }) {
  const [portion, setPortion] = useState(2);

  return (
    <div className={styles.container}>
      {/* Top Navigation Overlay */}
      <div className={styles.navOverlay}>
        <Link href="/" className={styles.iconBtn}>
          <ArrowLeft size={24} color="#1F2937" />
        </Link>
        <div className={styles.rightActions}>
          <button className={styles.iconBtn}>
            <Heart size={24} color="#1F2937" />
          </button>
          <button className={styles.iconBtn}>
            <Share2 size={24} color="#1F2937" />
          </button>
        </div>
      </div>

      {/* Main Image */}
      <div className={styles.imageSection}>
        <div className={styles.placeholderImage} />
        <span className={styles.tag}>
          <span style={{ marginRight: '6px' }}>✓</span> Tayyor
        </span>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <h1 className={styles.title}>Chocolate Delight</h1>
        <p className={styles.subtitle}>Rich chocolate cake with ganache</p>

        {/* Info Alert */}
        <div className={styles.alert}>
          <CircleAlert size={20} color="#15803D" className={styles.alertIcon} />
          <p className={styles.alertText}>
            Bu tayyor tort. Siz faqat porsiya miqdorini tanlaysiz va buyurtma berasiz!
          </p>
        </div>

        {/* Portions */}
        <PortionSelector selected={portion} onSelect={setPortion} />

        {/* Spacer for bottom bar */}
        <div style={{ height: '100px' }} />
      </div>

      {/* Bottom Action */}
      <BottomAction price="228,000 so'm" />
    </div>
  );
}
