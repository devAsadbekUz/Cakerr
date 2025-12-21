'use client';

import { Headset } from 'lucide-react';
import SearchBar from '../home/SearchBar';
import CategoryFilter from '../home/CategoryFilter';

interface HeaderProps {
    searchTerm: string;
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    activeCategory: string;
    onSelectCategory: (id: string) => void;
    onContactClick: () => void;
}

export default function Header({
    searchTerm,
    onSearchChange,
    activeCategory,
    onSelectCategory,
    onContactClick
}: HeaderProps) {
    return (
        <div style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            backgroundColor: '#F9FAFB',
            paddingBottom: '5px'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 20px 10px 20px'
            }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1F2937' }}>Tortlarni kashf eting</h1>
                <button style={{
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

            <div style={{ padding: '0 20px', marginBottom: '10px' }}>
                <SearchBar value={searchTerm} onChange={onSearchChange} />
            </div>

            <CategoryFilter activeCategory={activeCategory} onSelectCategory={onSelectCategory} />
        </div>
    );
}
