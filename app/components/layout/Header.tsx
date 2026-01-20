import { Headset } from 'lucide-react';
import SearchBar from '../home/SearchBar';
import CategoryFilter from '../home/CategoryFilter';
import styles from './Header.module.css';

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
    return (
        <div className={`${styles.fixedContainer} ${isCollapsed ? styles.collapsed : ''}`}>
            <div className={styles.headerSection}>
                <h1 className={styles.title}>Tortlarni kashf eting</h1>
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

            <div className={styles.searchWrapper}>
                <SearchBar value={searchTerm} onChange={onSearchChange} />
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
