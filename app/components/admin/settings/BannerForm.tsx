import { useState, useEffect } from 'react';
import { Banner } from './BannerItem';
import LanguageTabs from '../LanguageTabs';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import { getLocalized } from '@/app/utils/i18n';

type LinkType = 'home' | 'category' | 'product' | 'custom';

interface Category { id: string; label: any }
interface Product  { id: string; title: any }

const parseLocalized = (val: any, fallback: string = ''): { uz: string; ru: string } => {
    if (!val) return { uz: fallback, ru: fallback };
    if (typeof val === 'string') {
        if (val.startsWith('{')) {
            try {
                const p = JSON.parse(val);
                return { uz: p.uz || val, ru: p.ru || val };
            } catch (e) {}
        }
        return { uz: val, ru: val };
    }
    return { uz: val.uz || fallback, ru: val.ru || fallback };
};

const inferLinkType = (url: string): { type: LinkType; id: string; custom: string } => {
    if (!url || url === '/') return { type: 'home', id: '', custom: '/' };
    if (url.startsWith('/mahsulot/')) return { type: 'product', id: url.slice('/mahsulot/'.length), custom: '/' };
    if (url.startsWith('/#category-')) return { type: 'category', id: url.slice('/#category-'.length), custom: '/' };
    return { type: 'custom', id: '', custom: url };
};

export function BannerForm({
    banner,
    categories,
    products,
    onSave,
    onCancel,
}: {
    banner?: Banner;
    categories: Category[];
    products: Product[];
    onSave: (b: Partial<Banner>) => void;
    onCancel: () => void;
}) {
    const { t, lang } = useAdminI18n();
    const [activeTab, setActiveTab] = useState<'uz' | 'ru'>('uz');

    const [badgeText, setBadgeText]   = useState<{ uz: string; ru: string }>({ uz: '', ru: '' });
    const [titleText, setTitleText]   = useState<{ uz: string; ru: string }>({ uz: '', ru: '' });
    const [buttonText, setButtonText] = useState<{ uz: string; ru: string }>({ uz: 'Buyurtma berish', ru: 'Заказать' });
    const [bgColor, setBgColor]       = useState('#BE185D');
    const [isActive, setIsActive]     = useState(true);

    const [linkType, setLinkType]     = useState<LinkType>('home');
    const [selectedId, setSelectedId] = useState<string>('');
    const [customUrl, setCustomUrl]   = useState<string>('/');
    const [linkError, setLinkError]   = useState<string>('');

    useEffect(() => {
        if (banner) {
            setBadgeText(parseLocalized(banner.badge_text));
            setTitleText(parseLocalized(banner.title_text));
            setButtonText(parseLocalized(banner.button_text, 'Buyurtma berish'));
            setBgColor(banner.bg_color || '#BE185D');
            setIsActive(banner.is_active ?? true);

            const { type, id, custom } = inferLinkType(banner.link_url || '/');
            setLinkType(type);
            setSelectedId(id);
            setCustomUrl(custom);
        }
    }, [banner]);

    const handleLinkTypeChange = (type: LinkType) => {
        setLinkType(type);
        setLinkError('');
        if (type === 'category') setSelectedId(categories[0]?.id ?? '');
        else if (type === 'product') setSelectedId(products[0]?.id ?? '');
        else setSelectedId('');
    };

    const buildLinkUrl = (): string => {
        switch (linkType) {
            case 'home':     return '/';
            case 'product':  return `/mahsulot/${selectedId}`;
            case 'category': return `/#category-${selectedId}`;
            case 'custom':   return customUrl || '/';
        }
    };

    const handleSaveLocal = () => {
        if ((linkType === 'product' || linkType === 'category') && !selectedId) {
            setLinkError(t('bannerLinkRequired'));
            return;
        }
        onSave({
            id: banner?.id,
            badge_text: badgeText,
            title_text: titleText,
            button_text: buttonText,
            link_url: buildLinkUrl(),
            bg_color: bgColor,
            is_active: isActive,
        });
    };

    const linkTypeButtons: { type: LinkType; label: string }[] = [
        { type: 'home',     label: t('bannerLinkHome') },
        { type: 'category', label: t('category') },
        { type: 'product',  label: t('bannerLinkProduct') },
        { type: 'custom',   label: t('bannerLinkCustom') },
    ];

    return (
        <div style={{ background: 'white', padding: '24px', borderRadius: '20px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                    {banner ? t('editBanner') : t('addBanner')}
                </h3>
                <LanguageTabs activeTab={activeTab} onTabChange={setActiveTab} />
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
                {/* Badge */}
                <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>
                        Badge ({activeTab.toUpperCase()})
                    </label>
                    <input
                        type="text"
                        value={badgeText[activeTab]}
                        onChange={e => setBadgeText({ ...badgeText, [activeTab]: e.target.value })}
                        style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB', boxSizing: 'border-box' }}
                        placeholder="🎉 Yangi mahsulotlar"
                    />
                </div>

                {/* Title */}
                <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>
                        Sarlavha ({activeTab.toUpperCase()})
                    </label>
                    <input
                        type="text"
                        value={titleText[activeTab]}
                        onChange={e => setTitleText({ ...titleText, [activeTab]: e.target.value })}
                        style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB', boxSizing: 'border-box' }}
                        placeholder="30% chegirma..."
                    />
                </div>

                {/* Button text + color picker */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>
                            Tugma matni ({activeTab.toUpperCase()})
                        </label>
                        <input
                            type="text"
                            value={buttonText[activeTab]}
                            onChange={e => setButtonText({ ...buttonText, [activeTab]: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>Rang (HEX)</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                            {[
                                { name: 'Pushti',    hex: '#BE185D' },
                                { name: 'Moviy',     hex: '#1D4ED8' },
                                { name: 'Yashil',   hex: '#047857' },
                                { name: 'Sariq',    hex: '#B45309' },
                                { name: 'Binafsha', hex: '#7C3AED' },
                                { name: "To'q",     hex: '#111827' },
                            ].map(color => (
                                <button
                                    key={color.hex}
                                    type="button"
                                    onClick={() => setBgColor(color.hex)}
                                    style={{
                                        width: '24px', height: '24px',
                                        borderRadius: '50%',
                                        background: color.hex,
                                        border: bgColor === color.hex ? '2px solid white' : '1px solid #E5E7EB',
                                        boxShadow: bgColor === color.hex ? '0 0 0 2px #BE185D' : 'none',
                                        cursor: 'pointer',
                                    }}
                                    title={color.name}
                                />
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="color"
                                value={bgColor}
                                onChange={e => setBgColor(e.target.value)}
                                style={{ width: '40px', height: '40px', padding: '0', border: 'none', background: 'none' }}
                            />
                            <input
                                type="text"
                                value={bgColor}
                                onChange={e => setBgColor(e.target.value)}
                                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: '12px' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Link destination */}
                <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '8px', display: 'block' }}>
                        {t('bannerLinkType')}
                    </label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        {linkTypeButtons.map(({ type, label }) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => handleLinkTypeChange(type)}
                                style={{
                                    padding: '7px 14px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: linkType === type ? '#BE185D' : '#F3F4F6',
                                    color: linkType === type ? 'white' : '#374151',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    transition: 'background 0.15s, color 0.15s',
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {linkType === 'home' && (
                        <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>→ /</p>
                    )}

                    {linkType === 'category' && (
                        <select
                            value={selectedId}
                            onChange={e => { setSelectedId(e.target.value); setLinkError(''); }}
                            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: `1px solid ${linkError ? '#EF4444' : '#E5E7EB'}`, fontSize: '14px', boxSizing: 'border-box' }}
                        >
                            {categories.length === 0
                                ? <option disabled>{t('loading')}</option>
                                : categories.map(c => (
                                    <option key={c.id} value={c.id}>{getLocalized(c.label, lang)}</option>
                                ))
                            }
                        </select>
                    )}

                    {linkType === 'product' && (
                        <select
                            value={selectedId}
                            onChange={e => { setSelectedId(e.target.value); setLinkError(''); }}
                            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: `1px solid ${linkError ? '#EF4444' : '#E5E7EB'}`, fontSize: '14px', boxSizing: 'border-box' }}
                        >
                            {products.length === 0
                                ? <option disabled>{t('loading')}</option>
                                : products.map(p => (
                                    <option key={p.id} value={p.id}>{getLocalized(p.title, lang)}</option>
                                ))
                            }
                        </select>
                    )}

                    {linkType === 'custom' && (
                        <input
                            type="text"
                            value={customUrl}
                            onChange={e => setCustomUrl(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB', boxSizing: 'border-box' }}
                            placeholder="/"
                        />
                    )}

                    {linkError && (
                        <p style={{ fontSize: '12px', color: '#EF4444', margin: '4px 0 0' }}>{linkError}</p>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                    type="button"
                    onClick={handleSaveLocal}
                    style={{ flex: 1, background: '#BE185D', color: 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                    {t('save')}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    style={{ flex: 1, background: '#F3F4F6', color: '#374151', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                    {t('cancel')}
                </button>
            </div>
        </div>
    );
}
