import * as XLSX from 'xlsx';

export const exportToExcel = (dataSets: { sheetName: string; data: any[] }[], fileName: string) => {
    const wb = XLSX.utils.book_new();

    dataSets.forEach(set => {
        const ws = XLSX.utils.json_to_sheet(set.data);
        XLSX.utils.book_append_sheet(wb, ws, set.sheetName);
    });

    XLSX.writeFile(wb, `${fileName}.xlsx`);
};

export const formatOrderDataForExcel = (orders: any[]) => {
    return orders.map(o => {
        let deliveryDate = '';
        if (o.delivery_time) {
            try {
                const d = new Date(o.delivery_time);
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                deliveryDate = `${day}-${month}-${year}`;
                const slot = typeof o.delivery_slot === 'string' ? o.delivery_slot.trim() : '';
                if (slot) deliveryDate += `, ${slot}`;
            } catch {
                deliveryDate = o.delivery_time;
            }
        }

        return {
            'ID': o.id.slice(0, 8),
            'Sana': new Date(o.created_at).toLocaleString('uz-UZ'),
            'Yetkazish sanasi': deliveryDate || '—',
            'Mijoz': o.profiles?.full_name || 'Noma\'lum',
            'Telefon': o.profiles?.phone_number || '',
            'Mahsulotlar': o.order_items?.map((i: any) => `${i.name} (${i.quantity}x)`).join(', ') || '',
            'Jami (so\'m)': o.total_price,
            'Holat': o.status,
            'Manzil': o.delivery_address?.street || ''
        };
    });
};

export const formatProductDataForExcel = (products: any[]) => {
    return products.map(p => ({
        'Nomi': p.title,
        'Narxi': p.base_price,
        'Kategoriya': p.category_id || 'Boshqa',
        'Holat': p.is_available ? 'Mavjud' : 'Yo\'q',
        'Tayyor': p.is_ready ? 'Ha' : 'Yo\'q'
    }));
};

export const formatUserDataForExcel = (users: any[]) => {
    return users.map(u => ({
        'Ism': u.full_name || 'Noma\'lum',
        'Telefon': u.phone_number || '',
        'Tangalar': u.coins || 0,
        'Rol': u.role
    }));
};
