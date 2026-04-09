/**
 * Centralized configuration for order statuses
 * This ensures consistency between the Web UI (Admin/Client) and the Telegram Bot
 */

export const ORDER_STATUSES = [
    {
        id: 'new',
        labels: { uz: 'Buyurtma qabul qilindi', ru: 'Заказ принят' },
        tgLabels: { uz: '🆕 Yangi', ru: '🆕 Новый' },
        descs: { uz: 'Sizning buyurtmangiz tizimga tushdi', ru: 'Ваш заказ поступил в систему' },
        nextAction: 'confirmed',
        nextLabels: { uz: '✅ Tasdiqlash', ru: '✅ Подтвердить' }
    },
    {
        id: 'confirmed',
        labels: { uz: 'Tasdiqlandi', ru: 'Подтвержден' },
        tgLabels: { uz: '✅ Tasdiqlangan', ru: '✅ Подтвержден' },
        descs: { uz: 'Buyurtmangiz menejer tomonidan tasdiqlandi', ru: 'Ваш заказ подтвержден менеджером' },
        nextAction: 'preparing',
        nextLabels: { uz: '🍳 Pishirishni boshlash', ru: '🍳 Начать готовить' }
    },
    {
        id: 'preparing',
        labels: { uz: 'Tayyorlanmoqda', ru: 'Готовится' },
        tgLabels: { uz: '🍳 Pishirilmoqda', ru: '🍳 Готовится' },
        descs: { uz: 'Sizning shirinligingiz pishirilmoqda', ru: 'Ваша сладость готовится' },
        nextAction: 'ready',
        nextLabels: { uz: '📦 Tayyor', ru: '📦 Готово' }
    },
    {
        id: 'ready',
        labels: { uz: 'Tayyor', ru: 'Готов' },
        tgLabels: { uz: '📦 Tayyor', ru: '📦 Готов' },
        descs: { uz: 'Buyurtmangiz qadoqlandi va tayyor holatga keldi', ru: 'Ваш заказ упакован и готов' },
        nextAction: 'delivering',
        nextLabels: { uz: '🚗 Yetkazishni boshlash', ru: '🚗 Начать доставку' }
    },
    {
        id: 'delivering',
        labels: { uz: 'Yo\'lda', ru: 'В пути' },
        tgLabels: { uz: '🚗 Yo\'lda', ru: '🚗 В пути' },
        descs: { uz: 'Buyurtmangiz kuryerga topshirildi', ru: 'Ваш заказ передан курьеру' },
        nextAction: 'completed',
        nextLabels: { uz: '✅ Yetkazildi', ru: '✅ Доставлено' }
    },
    {
        id: 'completed',
        labels: { uz: 'Yetkazildi', ru: 'Доставлен' },
        tgLabels: { uz: '✅ Yetkazildi', ru: '✅ Доставлен' },
        descs: { uz: 'Buyurtmangiz muvaffaqiyatli yetkazildi', ru: 'Ваш заказ успешно доставлен' },
        nextAction: null,
        nextLabels: null
    },
    {
        id: 'cancelled',
        labels: { uz: 'Bekor qilindi', ru: 'Отменен' },
        tgLabels: { uz: '❌ Bekor qilindi', ru: '❌ Отменен' },
        descs: { uz: 'Buyurtma bekor qilindi', ru: 'Заказ отменен' },
        nextAction: null,
        nextLabels: null
    }
];

export type OrderStatus = typeof ORDER_STATUSES[number]['id'];

export const getStatusConfig = (id: string) => {
    return ORDER_STATUSES.find(s => s.id === id) || ORDER_STATUSES[0];
};

/**
 * Gets the next possible status transitions for Telegram buttons
 */
export const getTelegramButtons = (status: string, orderId: string, lang: 'uz' | 'ru' = 'uz', order?: any) => {
    const current = getStatusConfig(status);
    if (!current || !current.nextAction) return [];

    let nextAction = current.nextAction;
    let buttonLabel = current.nextLabels![lang];

    // Logic for Pickup orders: ready -> completed (skip delivering)
    const isPickup = order?.delivery_type === 'pickup';
    if (status === 'ready' && isPickup) {
        nextAction = 'completed';
        buttonLabel = lang === 'uz' ? '✅ Olib ketildi' : '✅ Самовывоз завершён';
    }

    const rows: { text: string; callback_data: string }[][] = [
        [{ text: buttonLabel, callback_data: `${nextAction}_${orderId}_${lang}` }]
    ];

    // new → easy cancel alongside the confirm button
    if (status === 'new') {
        rows[0].push({ text: lang === 'uz' ? '❌ Bekor qilish' : '❌ Отменить', callback_data: `cancel_${orderId}_${lang}` });
    }

    // confirmed+ → friction cancel on a separate row (two-step confirmation in webhook)
    if (['confirmed', 'preparing', 'ready', 'delivering'].includes(status)) {
        rows.push([{ text: lang === 'uz' ? '⚠️ Bekor qilish' : '⚠️ Отменить', callback_data: `precancel_${orderId}_${lang}` }]);
    }

    return rows; // Telegram expects an array of arrays (rows)
};

/**
 * Escapes special characters for Telegram Markdown (V1)
 */
export const tgEscape = (text: any): string => {
    if (!text) return '';
    const str = String(text);
    // Markdown V1 special characters: * _ [ `
    // We escape them with a backslash or just strip them if they are likely to cause issues.
    // Given the context of names and comments, stripping/replacing is often safer than escaping.
    return str
        .replace(/\*/g, '') // Strip bold
        .replace(/_/g, ' ') // Replace underscore with space
        .replace(/\[/g, '(') // Replace [ with (
        .replace(/\]/g, ')') // Replace ] with )
        .replace(/`/g, "'"); // Replace backtick with quote
};

/**
 * Builds the Telegram message text for an order
 */
export const buildOrderMessage = (order: any, lang: 'uz' | 'ru' = 'uz') => {
    const statusConfig = getStatusConfig(order.status);
    let statusLabel = statusConfig.tgLabels[lang];
    const isPickup = order.delivery_type === 'pickup';

    // Status Enhancement for Pickup orders (Adds " - Olib ketish" / " - Самовывоз")
    if (isPickup) {
        statusLabel += ` - ${lang === 'uz' ? 'Olib ketish' : 'Самовывоз'}`;
    }
    const shortId = order.id.slice(0, 8);
    
    const t = {
        uz: {
            order: "BUYURTMA",
            client: "Mijoz",
            phone: "Telefon",
            address: "Manzil",
            noAddress: "Manzil ko'rsatilmagan",
            time: "Vaqt",
            unknown: "Noma'lum",
            products: "Mahsulotlar",
            comment: "Izoh",
            total: "Jami",
            som: "so'm"
        },
        ru: {
            order: "ЗАКАЗ",
            client: "Клиент",
            phone: "Телефон",
            address: "Адрес",
            noAddress: "Адрес не указан",
            time: "Время",
            unknown: "Неизвестно",
            products: "Товары",
            comment: "Комментарий",
            total: "Итого",
            som: "сум"
        }
    }[lang];

    let messageText = isPickup
        ? `🏪 *【 ${lang === 'uz' ? 'OLIB KETISH' : 'САМОВЫВОЗ'} 】* 🏪\n*Status:* [${statusLabel}]\n`
        : `🎂 *${t.order}* [${statusLabel}]\n`;
    messageText += `📋 *ID:* #${shortId}\n`;
    if (order.created_by_name) {
        messageText += `🖥️ *POS* | ${lang === 'uz' ? 'Qabul qildi' : 'Принял'}: ${tgEscape(order.created_by_name)}\n`;
    }
    messageText += '\n';

    if (order.profiles) {
        const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
        if (profile) {
            const name = tgEscape(profile.full_name || order.customer_name || t.unknown);
            const phone = tgEscape(profile.phone_number || order.customer_phone || t.unknown);
            messageText += `👤 *${t.client}:* ${name}\n`;
            messageText += `📞 *${t.phone}:* ${phone}\n\n`;
        }
    } else if (order.customer_name || order.customer_phone) {
        const name = tgEscape(order.customer_name || t.unknown);
        const phone = tgEscape(order.customer_phone || t.unknown);
        messageText += `👤 *${t.client}:* ${name}\n`;
        messageText += `📞 *${t.phone}:* ${phone}\n\n`;
    }

    if (isPickup) {
        const branchName = lang === 'uz' ? order.branches?.name_uz : order.branches?.name_ru;
        const branchAddr = lang === 'uz' ? order.branches?.address_uz : order.branches?.address_ru;
        const branchLink = order.branches?.location_link;

        messageText += `🏢 *${lang === 'uz' ? 'Filial' : 'Филиал'}:* ${tgEscape(branchName || t.unknown)}\n`;
        messageText += `📍 *${t.address}:* ${branchLink ? `[${tgEscape(branchAddr)}]( ${branchLink} )` : tgEscape(branchAddr || t.noAddress)}\n`;
    } else if (order.delivery_address) {
        const addrObj = typeof order.delivery_address === 'string'
            ? { street: order.delivery_address }
            : order.delivery_address;

        let street = tgEscape(addrObj.street || t.noAddress);
        if (addrObj.lat && addrObj.lng) {
            street = `[${street}](https://www.google.com/maps?q=${addrObj.lat},${addrObj.lng})`;
        }
        messageText += `📍 *${t.address}:* ${street}\n`;
    }

    let dateFormatted = t.unknown;
    if (order.delivery_time) {
        const d = new Date(order.delivery_time);
        if (!isNaN(d.getTime())) {
            dateFormatted = d.toLocaleDateString(lang === 'uz' ? 'uz-UZ' : 'ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } else {
            // Fallback for raw strings if needed
            dateFormatted = tgEscape(String(order.delivery_time));
        }
    }
    
    const slot = tgEscape(order.delivery_slot || t.unknown);
    messageText += `📅 *${t.time}:* ${dateFormatted}, ${slot}\n\n`;

    if (order.order_items?.length) {
        messageText += `🛒 *${t.products}:*\n`;
        order.order_items.forEach((item: any) => {
            const cfg = item.configuration || {};
            const isCustom = !item.product_id || item.product_id === '00000000-0000-0000-0000-000000000000';
            const name = tgEscape(item.name || 'Mahsulot');
            const price = (item.unit_price * item.quantity).toLocaleString();

            if (isCustom) {
                // Custom cake — show full configuration on separate lines
                messageText += `  • ${item.quantity}x *${name}* - ${price} ${t.som}\n`;
                const details: string[] = [];
                if (cfg.shape) details.push(`Shakl: ${tgEscape(cfg.shape)}`);
                if (cfg.size) details.push(`O'lcham: ${tgEscape(cfg.size)}`);
                if (cfg.sponge) details.push(`Biskvit: ${tgEscape(cfg.sponge)}`);
                if (cfg.flavor) details.push(`Krem: ${tgEscape(cfg.flavor)}`);
                if (details.length) messageText += `    🔹 ${details.join(' | ')}\n`;
                if (cfg.decorations) messageText += `    🎀 ${lang === 'uz' ? 'Bezaklar' : 'Декор'}: ${tgEscape(cfg.decorations)}\n`;
            } else {
                // Standard product — compact format
                const portionText = cfg.portion ? ` (${tgEscape(cfg.portion)})` : '';
                const flavorText = cfg.flavor ? ` | ${tgEscape(cfg.flavor)}` : '';
                messageText += `  • ${item.quantity}x ${name}${portionText}${flavorText} - ${price} ${t.som}\n`;
            }

            const note = cfg.custom_note || cfg.order_note;
            if (note) messageText += `    📝 _${tgEscape(note)}_\n`;
        });
    }

    if (order.comment) {
        messageText += `\n💬 *${t.comment}:* "${tgEscape(order.comment)}"\n`;
    }

    if (order.payment_method) {
        const payLabel = lang === 'uz' ? "To'lov" : "Оплата";
        const cashLabel = lang === 'uz' ? "Naqd pul 💵" : "Наличными 💵";
        const cardLabel = lang === 'uz' ? "Plastik karta 💳" : "Картой 💳";
        messageText += `\n💳 *${payLabel}:* ${order.payment_method === 'cash' ? cashLabel : cardLabel}\n`;
    }

    if (Number(order.promo_discount) > 0) {
        const promoLabel = lang === 'uz' ? "Promokod chegirmasi" : "Скидка по промокоду";
        messageText += `🏷 *${promoLabel}:* -${Number(order.promo_discount).toLocaleString()} ${t.som}\n`;
    }

    if (Number(order.coins_spent) > 0) {
        const coinsLabel = lang === 'uz' ? "Shirin tangalar" : "Монеты";
        messageText += `🪙 *${coinsLabel}:* -${Number(order.coins_spent).toLocaleString()} ${t.som}\n`;
    }

    if (order.total_price) {
        messageText += `\n💰 *${t.total}:* ${Number(order.total_price).toLocaleString()} ${t.som}`;
    }

    const depositAmount = Number(order.deposit_amount ?? 0);
    const finalPayment = Number(order.final_payment_amount ?? 0);
    const confirmedStatuses = ['confirmed', 'preparing', 'ready', 'delivering', 'completed'];
    const isConfirmedPlus = confirmedStatuses.includes(order.status);

    if (isConfirmedPlus) {
        if (depositAmount > 0 || order.payment_logs?.length > 0) {
            const depositLabel = lang === 'uz' ? 'To\'lovlar' : 'Оплаты';
            const remainingLabel = lang === 'uz' ? 'Qoldiq' : 'Остаток';
            
            // If we have detailed logs, show the ledger. Otherwise fallback to simple total.
            let paymentSection = `\n💰 *${depositLabel}:*`;
            if (order.payment_logs && order.payment_logs.length > 0) {
                order.payment_logs.forEach((log: any) => {
                    const amt = Number(log.amount);
                    const sign = amt >= 0 ? '+' : '';
                    const recordedBy = log.recorded_by_name ? ` (${tgEscape(log.recorded_by_name)})` : '';
                    paymentSection += `\n  • ${sign}${amt.toLocaleString()} ${t.som}${recordedBy}`;
                });
            } else {
                paymentSection += ` ${depositAmount.toLocaleString()} ${t.som}`;
            }

            const remaining = Math.max(0, Number(order.total_price ?? 0) - depositAmount);
            if (order.status === 'completed' && finalPayment > 0) {
                const finalLabel = lang === 'uz' ? "Yakuniy to'lov" : 'Итог. оплата';
                paymentSection += `\n💵 *${finalLabel}:* ${finalPayment.toLocaleString()} ${t.som}`;
            } else if (remaining > 0) {
                paymentSection += `\n💰 *${remainingLabel}:* ${remaining.toLocaleString()} ${t.som}`;
            }
            messageText += paymentSection;
        } else if (order.status !== 'completed') {
            const noDepositLabel = lang === 'uz' ? 'Avans qabul qilinmagan' : 'Аванс не получен';
            messageText += `\n⚠️ _${noDepositLabel}_`;
        }
    }

    return messageText;
};

/**
 * Robustly parses a language value from various database formats (String, JSONB Object, Quoted String)
 */
export const parseLang = (val: any): 'uz' | 'ru' => {
    if (!val) return 'uz';
    let str = '';
    if (typeof val === 'string') str = val;
    else if (typeof val === 'object') str = val.lang || '';
    
    // Strip quotes and normalize
    str = str.replace(/['"]+/g, '').trim().toLowerCase();
    return (str === 'ru') ? 'ru' : 'uz';
};

/**
 * Resolves the final language for an order based on priority:
 * 1. Saved order preference (delivery_address.lang)
 * 2. Admin's global preference (app_settings.admin_tg_lang)
 * 3. Fallback (callback data or customer choice)
 */
export const resolveOrderLanguage = (params: {
    orderSavedLang?: any;
    adminPreferredLang?: any;
    fallbackLang?: any;
}): 'uz' | 'ru' => {
    // 1. Check common Admin preference (The currently globally selected language in the Dashboard)
    // The user wants the bot to follow the Admin setting primarily.
    const adminRaw = params.adminPreferredLang;
    if (adminRaw) {
        return parseLang(adminRaw);
    }

    // 2. Check saved order preference (Historical context if Admin setting is somehow missing)
    const savedRaw = params.orderSavedLang;
    if (savedRaw) {
        return parseLang(savedRaw);
    }

    // 3. Last resort: use the requested fallback (callback data or client input)
    return parseLang(params.fallbackLang);
};

/**
 * Builds a unified status message for the customer, combining the latest status info
 * with the full payment ledger.
 */
export const buildCustomerStatusMessage = (order: any, lang: 'uz' | 'ru' = 'uz') => {
    const statusConfig = getStatusConfig(order.status);
    const shortId = order.id.slice(0, 8);
    
    const clientLabels = {
        uz: {
            title: "🍰 *Buyurtma holati yangilandi*",
            text: `Hurmatli mijoz, sizning #${shortId} raqamli buyurtmangiz holati o'zgardi:`,
            history: "*To'lovlar tarixi:*",
            totalPaid: "Jami to'landi",
            totalSpent: "Jami summa",
            remaining: "Qoldiq",
            som: "so'm"
        },
        ru: {
            title: "🍰 *Статус заказа обновлен*",
            text: `Уважаемый клиент, статус вашего заказа #${shortId} изменился:`,
            history: "*История платежей:*",
            totalPaid: "Всего оплачено",
            totalSpent: "Итого",
            remaining: "Остаток",
            som: "сум"
        }
    }[lang];

    const statusLabel = statusConfig.labels[lang];
    const statusDesc = statusConfig.descs[lang];

    // 1. Status Section
    let message = `${clientLabels.title}\n\n${clientLabels.text}\n\n*${tgEscape(statusLabel)}*\n_${tgEscape(statusDesc)}_`;

    // 2. Fulfillment Section (Pickup Address)
    if (order.status === 'ready' && order.delivery_type === 'pickup' && order.branches) {
        const branch = order.branches;
        const bName = lang === 'uz' ? branch.name_uz : branch.name_ru;
        const bAddr = lang === 'uz' ? branch.address_uz : branch.address_ru;
        const bLink = branch.location_link;

        const pickupInfo = lang === 'uz'
            ? `\n\n🏢 *Olib ketish manzili:* ${tgEscape(bName)}\n📍 ${tgEscape(bAddr)}`
            : `\n\n🏢 *Адрес самовывоза:* ${tgEscape(bName)}\n📍 ${tgEscape(bAddr)}`;
        
        message += pickupInfo;
        if (bLink) {
            const mapLabel = lang === 'uz' ? "📍 Xaritada ko'rish" : "📍 Посмотреть на карте";
            message += `\n\n[${mapLabel}](${bLink})`;
        }
    }

    // 3. Payment Ledger Section
    const logs = order.payment_logs || [];
    if (logs.length > 0) {
        message += `\n\n${clientLabels.history}\n`;
        logs.forEach((log: any) => {
            const amt = Number(log.amount);
            const sign = amt >= 0 ? '+' : '';
            message += `▫️ ${sign}${amt.toLocaleString()} ${clientLabels.som}\n`;
        });
    }

    // 4. Totals Section
    const depositAmount = Number(order.deposit_amount ?? 0);
    const finalPayment = Number(order.final_payment_amount ?? 0);
    const totalPaid = depositAmount + finalPayment;
    const totalPrice = Number(order.total_price ?? 0);
    
    if (totalPaid > 0 || order.status === 'completed') {
        const totalsLine = `\n✅ *${clientLabels.totalPaid}:* ${totalPaid.toLocaleString()} / ${totalPrice.toLocaleString()} ${clientLabels.som}`;
        message += totalsLine;
    } else if (order.status === 'confirmed' && depositAmount === 0) {
         const noDepositInfo = lang === 'uz'
                ? `\n\n⚠️ _Avans to'lovi haqida menejer siz bilan bog'lanadi._`
                : `\n\n⚠️ _Менеджер свяжется с вами по вопросу предоплаты._`;
         message += noDepositInfo;
    }

    return message;
};
