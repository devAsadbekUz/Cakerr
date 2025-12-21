'use client';

import styles from './PortionSelector.module.css';

interface PortionSelectorProps {
  selected: number;
  onSelect: (val: number) => void;
}

const OPTIONS = [
  { value: 2, label: 'kishilik' },
  { value: 4, label: 'kishilik' },
  { value: 6, label: 'kishilik' },
];

export default function PortionSelector({ selected, onSelect }: PortionSelectorProps) {
  return (
    <div className={styles.container}>
      <h3 className={styles.label}>Porsiyalar (Necha kishiga)</h3>
      <div className={styles.grid}>
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`${styles.card} ${selected === opt.value ? styles.active : ''}`}
            onClick={() => onSelect(opt.value)}
          >
            <span className={styles.value}>{opt.value}</span>
            <span className={styles.sub}>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
