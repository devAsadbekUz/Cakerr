import { Search } from 'lucide-react';
import styles from './SearchBar.module.css';

interface SearchBarProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
    return (
        <div className={styles.wrapper}>
            <Search className={styles.icon} size={20} />
            <input
                type="text"
                placeholder={placeholder || "Tortlarni qidiring..."}
                className={styles.input}
                value={value}
                onChange={onChange}
            />
        </div>
    );
}
