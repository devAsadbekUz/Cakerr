'use client';

import { ShoppingCart, Minus, Plus } from 'lucide-react';
import styles from './BottomAction.module.css';
import { useState } from 'react';

export default function BottomAction({ price }: { price: string }) {
  const [count, setCount] = useState(1);

  return (
    <div className={styles.bar}>
      <div className={styles.priceInfo}>
        <span className={styles.label}>Jami narx</span>
        <span className={styles.value}>{price}</span>
      </div>

      <div className={styles.controls}>
        <div className={styles.stepper}>
          <button
            className={styles.stepperBtn}
            onClick={() => setCount(Math.max(1, count - 1))}
          >
            <Minus size={16} />
          </button>
          <span className={styles.count}>{count}</span>
          <button
            className={styles.stepperBtn}
            onClick={() => setCount(count + 1)}
          >
            <Plus size={16} />
          </button>
        </div>

        <button className={styles.addButton}>
          <ShoppingCart size={20} className={styles.cartIcon} />
          <span>Qo'shish</span>
        </button>
      </div>
    </div>
  );
}
