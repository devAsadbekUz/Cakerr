'use client';

import { ShoppingCart, Minus, Plus } from 'lucide-react';
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
  // Calculate total price = unit price × quantity
  const numericPrice = typeof price === 'number' ? price : parseInt(String(price).replace(/\D/g, ''), 10) || 0;
  const totalPrice = numericPrice * quantity;
  const displayPrice = `${totalPrice.toLocaleString('uz-UZ')} so'm`;

  return (
    <div className={`${styles.bar} ${inline ? styles.inline : ''}`}>
      <div className={styles.priceInfo}>
        <span className={styles.label}>Jami narx</span>
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
              <span>Savat</span>
            </>
          ) : (
            <>
              <ShoppingCart size={20} className={styles.cartIcon} />
              <span>Qo'shish</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
