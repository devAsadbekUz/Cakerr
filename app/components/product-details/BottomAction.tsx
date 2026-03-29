'use client';

import { ShoppingCart, Minus, Plus } from 'lucide-react';
import { useLanguage } from '@/app/context/LanguageContext';
import styles from './BottomAction.module.css';

export default function BottomAction({
  price,
  quantity,
  isAdded,
  onIncrement,
  onDecrement,
  onMainAction,
  inline = false
}: {
  price: number | string;
  quantity: number;
  isAdded: boolean;
  onIncrement: (e: React.MouseEvent) => void;
  onDecrement: () => void;
  onMainAction: (e: React.MouseEvent) => void;
  inline?: boolean;
}) {
  const { t } = useLanguage();
  // Calculate total price = unit price × quantity
  const numericPrice = typeof price === 'number' ? price : parseInt(String(price).replace(/\D/g, ''), 10) || 0;
  const totalPrice = numericPrice * quantity;
  const displayPrice = `${totalPrice.toLocaleString('en-US')} ${t('som')}`;

  return (
    <div className={`${styles.bar} ${inline ? styles.inline : ''}`}>
      <div className={styles.priceInfo}>
        <span className={styles.label}>{t('totalPrice')}</span>
        <span className={styles.value}>{displayPrice}</span>
      </div>

      <div className={styles.controls}>
        <div className={styles.stepper}>
          <button
            className={styles.stepperBtn}
            onClick={onDecrement}
          >
            <Minus size={16} />
          </button>
          <span className={styles.count}>{quantity}</span>
          <button
            className={styles.stepperBtn}
            onClick={onIncrement}
          >
            <Plus size={16} />
          </button>
        </div>

        <button
          className={`${styles.addButton} ${isAdded ? styles.added : ''}`}
          onClick={onMainAction}
        >
          {isAdded ? (
            <>
              <ShoppingCart size={20} className={styles.cartIcon} />
              <span>{t('cart')}</span>
            </>
          ) : (
            <>
              <ShoppingCart size={20} className={styles.cartIcon} />
              <span>{t('add')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
