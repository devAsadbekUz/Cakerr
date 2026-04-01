import {
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff, Edit2, Trash2 } from 'lucide-react';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import { getLocalized } from '@/app/utils/i18n';

export interface Banner {
    id: string;
    badge_text: any;
    title_text: any;
    button_text: any;
    link_url: string;
    bg_color: string;
    is_active: boolean;
    sort_order: number;
}

export function SortableBannerItem({
    banner,
    onToggleActive,
    onEdit,
    onDelete,
}: {
    banner: Banner;
    onToggleActive: (b: Banner) => void;
    onEdit: (b: Banner) => void;
    onDelete: (id: string) => void;
}) {
    const { lang } = useAdminI18n();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: banner.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        border: '1px solid #F3F4F6',
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        opacity: isDragging ? 0.8 : (banner.is_active ? 1 : 0.6),
        background: isDragging ? '#FDF2F8' : 'white',
        zIndex: isDragging ? 1000 : 'auto',
        position: 'relative',
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <div style={{ cursor: 'grab', display: 'flex', alignItems: 'center', padding: '0 8px' }} {...listeners}>
                <GripVertical size={20} color="#9CA3AF" />
            </div>

            <div style={{
                width: '120px',
                height: '70px',
                background: banner.bg_color,
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                padding: '8px',
                color: 'white',
                fontSize: '8px',
                overflow: 'hidden'
            }}>
                <div style={{ opacity: 0.8 }}>{getLocalized(banner.badge_text, lang)}</div>
                <div style={{ fontWeight: 800, marginTop: '4px' }}>{getLocalized(banner.title_text, lang)}</div>
            </div>

            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>{getLocalized(banner.title_text, lang)}</div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                    {getLocalized(banner.badge_text, lang)} • {getLocalized(banner.button_text, lang)}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    onClick={() => onToggleActive(banner)}
                    style={{ background: banner.is_active ? '#ECFDF5' : '#F3F4F6', color: banner.is_active ? '#059669' : '#6B7280', border: 'none', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                    {banner.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
                <button
                    onClick={() => onEdit(banner)}
                    style={{ background: '#EFF6FF', color: '#3B82F6', border: 'none', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                    <Edit2 size={18} />
                </button>
                <button
                    onClick={() => onDelete(banner.id)}
                    style={{ background: '#FEF2F2', color: '#EF4444', border: 'none', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
}
