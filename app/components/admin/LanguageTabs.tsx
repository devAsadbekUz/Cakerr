'use client';

import React from 'react';

interface LanguageTabsProps {
    activeTab: 'uz' | 'ru';
    onTabChange: (tab: 'uz' | 'ru') => void;
}

export default function LanguageTabs({ activeTab, onTabChange }: LanguageTabsProps) {
    return (
        <div style={{ display: 'inline-flex', background: '#F3F4F6', padding: '3px', borderRadius: '8px', marginBottom: '6px' }}>
            <button
                type="button"
                onClick={() => onTabChange('uz')}
                style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: activeTab === 'uz' ? 'white' : 'transparent',
                    color: activeTab === 'uz' ? '#BE185D' : '#6B7280',
                    boxShadow: activeTab === 'uz' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s'
                }}
            >
                UZ
            </button>
            <button
                type="button"
                onClick={() => onTabChange('ru')}
                style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: activeTab === 'ru' ? 'white' : 'transparent',
                    color: activeTab === 'ru' ? '#BE185D' : '#6B7280',
                    boxShadow: activeTab === 'ru' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s'
                }}
            >
                RU
            </button>
        </div>
    );
}
