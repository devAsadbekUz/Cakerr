'use client';

import { ShoppingCart, Minus, Plus } from 'lucide-react';
import styles from './BottomAction.module.css';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BottomAction({
  price,
  onAdd,
  inline = false
}: {
  price: number | string;
  onAdd: (quantity: number) => void;
  inline?: boolean;
}) {
  const router = useRouter();
  const [count, setCount] = useState(1);
  const [added, setAdded] = useState(false);

  const displayPrice = typeof price === 'number'
    ? `${price.toLocaleString('en-US')} so'm`
    : price;

  const handleAdd = () => {
    if (added) {
      router.push('/savat');
    } else {
      onAdd(count);
      setAdded(true);
    }
  };

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

        <button
          className={`${styles.addButton} ${added ? styles.added : ''}`}
          onClick={handleAdd}
        >
          {added ? (
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
