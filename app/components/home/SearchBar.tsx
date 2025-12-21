import { Search } from 'lucide-react';
import styles from './SearchBar.module.css';

interface SearchBarProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
    return (
        <div className={styles.wrapper}>
            <Search className={styles.icon} size={20} />
            <input
                type="text"
                placeholder="Tortlarni qidiring..."
                className={styles.input}
                value={value}
                onChange={onChange}
            />
        </div>
    );
}
