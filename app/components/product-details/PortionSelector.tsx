'use client';

import { useMemo } from 'react';

import styles from './PortionSelector.module.css';

interface PortionOption {
  value: string;
  label?: string;
}

interface PortionSelectorProps {
  selected: string;
  onSelect: (val: string) => void;
  options?: PortionOption[];
}

const DEFAULT_OPTIONS = [
  { value: '2', label: 'kishilik' },
  { value: '4', label: 'kishilik' },
  { value: '6', label: 'kishilik' },
  { value: '8', label: 'kishilik' },
  { value: '10-12', label: 'kishilik' },
  { value: '12-16', label: 'kishilik' },
  { value: '16+', label: 'kishilik' },
];

export default function PortionSelector({
  selected,
  onSelect,
  options = DEFAULT_OPTIONS
}: PortionSelectorProps) {

  const uniqueOptions = useMemo(() => {
    const seen = new Set();
    return options.filter(opt => {
      if (seen.has(opt.value)) return false;
      seen.add(opt.value);
      return true;
    });
  }, [options]);

  return (
    <div className={styles.container}>
      <h3 className={styles.label}>Porsiyalar (Necha kishiga)</h3>
      <div className={styles.scrollWrapper}>
        <div className={styles.grid}>
          {uniqueOptions.map((opt, index) => (
            <button
              key={opt.value || index}
              className={`${styles.card} ${selected === opt.value ? styles.active : ''}`}
              onClick={() => onSelect(opt.value)}
            >
              <span className={styles.value}>{opt.value}</span>
              {opt.label && opt.label !== opt.value && (
                <span className={styles.sub}>{opt.label}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
