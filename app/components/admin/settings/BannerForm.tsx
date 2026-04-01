import { useState, useEffect } from 'react';
import { Banner } from './BannerItem';
import LanguageTabs from '../LanguageTabs';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';

export function BannerForm({
    banner,
    onSave,
    onCancel
}: {
    banner?: Banner,
    onSave: (b: Partial<Banner>) => void,
    onCancel: () => void
}) {
    const { t } = useAdminI18n();
    const [activeTab, setActiveTab] = useState<'uz' | 'ru'>('uz');
    
    const [badgeText, setBadgeText] = useState<{ uz: string; ru: string }>({ uz: '', ru: '' });
    const [titleText, setTitleText] = useState<{ uz: string; ru: string }>({ uz: '', ru: '' });
    const [buttonText, setButtonText] = useState<{ uz: string; ru: string }>({ uz: 'Buyurtma berish', ru: 'Заказать' });
    const [linkUrl, setLinkUrl] = useState('/');
    const [bgColor, setBgColor] = useState('#BE185D');
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        const parseLocalized = (val: any, fallback: string = '') => {
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

        if (banner) {
            setBadgeText(parseLocalized(banner.badge_text));
            setTitleText(parseLocalized(banner.title_text));
            setButtonText(parseLocalized(banner.button_text, 'Buyurtma berish'));
            setLinkUrl(banner.link_url || '/');
            setBgColor(banner.bg_color || '#BE185D');
            setIsActive(banner.is_active ?? true);
        }
    }, [banner]);

    const handleSaveLocal = () => {
        onSave({
            id: banner?.id,
            badge_text: badgeText,
            title_text: titleText,
            button_text: buttonText,
            link_url: linkUrl,
            bg_color: bgColor,
            is_active: isActive
        });
    };

    return (
        <div style={{ background: 'white', padding: '24px', borderRadius: '20px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                    {banner ? t('editBanner') || 'Bannerni tahrirlash' : t('addBanner') || 'Yangi banner'}
                </h3>
                <LanguageTabs activeTab={activeTab} onTabChange={setActiveTab} />
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>
                        Badge ({activeTab.toUpperCase()})
                    </label>
                    <input
                        type="text"
                        value={badgeText[activeTab]}
                        onChange={e => setBadgeText({ ...badgeText, [activeTab]: e.target.value })}
                        style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB' }}
                        placeholder="🎉 Yangi mahsulotlar"
                    />
                </div>
                <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>
                        Sarlavha ({activeTab.toUpperCase()})
                    </label>
                    <input
                        type="text"
                        value={titleText[activeTab]}
                        onChange={e => setTitleText({ ...titleText, [activeTab]: e.target.value })}
                        style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB' }}
                        placeholder="30% chegirma..."
                    />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>
                            Tugma matni ({activeTab.toUpperCase()})
                        </label>
                        <input
                            type="text"
                            value={buttonText[activeTab]}
                            onChange={e => setButtonText({ ...buttonText, [activeTab]: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB' }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>Rang (HEX)</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                            {[
                                { name: 'Pushti', hex: '#BE185D' },
                                { name: 'Moviy', hex: '#1D4ED8' },
                                { name: 'Yashil', hex: '#047857' },
                                { name: 'Sariq', hex: '#B45309' },
                                { name: 'Binafsha', hex: '#7C3AED' },
                                { name: 'To\'q', hex: '#111827' }
                            ].map(color => (
                                <button
                                    key={color.hex}
                                    type="button"
                                    onClick={() => setBgColor(color.hex)}
                                    style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        background: color.hex,
                                        border: bgColor === color.hex ? '2px solid white' : '1px solid #E5E7EB',
                                        boxShadow: bgColor === color.hex ? '0 0 0 2px #BE185D' : 'none',
                                        cursor: 'pointer'
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
                <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>Link (yo'naltirish)</label>
                    <input
                        type="text"
                        value={linkUrl}
                        onChange={e => setLinkUrl(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB' }}
                        placeholder="/"
                    />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                    type="button"
                    onClick={handleSaveLocal}
                    style={{ flex: 1, background: '#BE185D', color: 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                    {t('save') || 'Saqlash'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    style={{ flex: 1, background: '#F3F4F6', color: '#374151', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                    {t('cancel') || 'Bekor qilish'}
                </button>
            </div>
        </div>
    );
}
