'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/app/context/LanguageContext';

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

export default function PortionSelector({
  selected,
  onSelect,
  options
}: PortionSelectorProps) {
  const { t } = useLanguage();

  const DEFAULT_OPTIONS = [
    { value: '2', label: t('kishilik') },
    { value: '4', label: t('kishilik') },
    { value: '6', label: t('kishilik') },
    { value: '8', label: t('kishilik') },
    { value: '10-12', label: t('kishilik') },
    { value: '12-16', label: t('kishilik') },
    { value: '16+', label: t('kishilik') },
  ];

  const currentOptions = options || DEFAULT_OPTIONS;

  const uniqueOptions = useMemo(() => {
    const seen = new Set();
    return currentOptions.filter(opt => {
      if (seen.has(opt.value)) return false;
      seen.add(opt.value);
      return true;
    });
  }, [currentOptions]);

  return (
    <div className={styles.container}>
      <h3 className={styles.label}>{t('portions')}</h3>
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
