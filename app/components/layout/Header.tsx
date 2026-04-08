import { Headset } from 'lucide-react';
import SearchBar from '../home/SearchBar';
import CategoryFilter from '../home/CategoryFilter';
import styles from './Header.module.css';
import { useLanguage } from '@/app/context/LanguageContext';

interface HeaderProps {
    searchTerm: string;
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    activeCategory: string;
    onSelectCategory: (id: string) => void;
    onContactClick: () => void;
    categories: any[];
    isCollapsed?: boolean;
}

export default function Header({
    searchTerm,
    onSearchChange,
    activeCategory,
    onSelectCategory,
    onContactClick,
    categories,
    isCollapsed = false
}: HeaderProps) {
    const { lang, setLang, t } = useLanguage();

    const toggleLanguage = () => {
        setLang(lang === 'uz' ? 'ru' : 'uz');
    };

    return (
        <div className={styles.fixedContainer}>
            <div className={styles.headerSection}>
                <img src="/logo.png" alt="TORTEL'E" style={{ height: '72px', width: 'auto', objectFit: 'contain' }} />
                <div className={styles.headerButtons}>
                    <button
                        className={styles.langBtn}
                        onClick={toggleLanguage}
                        style={{
                            padding: '6px 10px',
                            borderRadius: '12px',
                            background: '#F3F4F6',
                            border: '1px solid #E5E7EB',
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#374151',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        {lang === 'uz' ? '🇺🇿' : '🇷🇺'}
                    </button>
                    <button
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: '#FFF3E0',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#F57C00',
                            cursor: 'pointer'
                        }}
                        onClick={onContactClick}
                    >
                        <Headset size={20} />
                    </button>
                </div>
            </div>

            <div className={`${styles.searchWrapper} ${isCollapsed ? styles.searchCollapsed : ''}`}>
                <SearchBar value={searchTerm} onChange={onSearchChange} placeholder={t('searchPlaceholder')} />
            </div>

            <div className={styles.filterWrapper}>
                <CategoryFilter
                    activeCategory={activeCategory}
                    onSelectCategory={onSelectCategory}
                    categories={categories}
                />
            </div>
        </div>
    );
}
