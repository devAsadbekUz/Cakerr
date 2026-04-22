import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { notifyAdminNewOrder } from '@/app/services/telegramNotificationService';
import { uploadBase64Image } from '@/app/utils/supabase/storageUtils';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
    try {
        const headerStore = await headers();
        const isAdminVerified = headerStore.get('x-admin-verified') === 'true';
        
        // In owner mode, the ID is in x-admin-user-id. In staff mode, we might need a different approach 
        // to find the staff ID. Middleware currently set x-admin-role as 'owner' or 'staff'.
        // Let's check middleware again — it sets x-admin-user-id for owner.
        const staffIdHeader = headerStore.get('x-admin-user-id');
        const creatorNameHeader = headerStore.get('x-admin-username');
        
        if (!isAdminVerified) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { items, customerInfo, deliveryInfo, orderNote } = body;

        if (!items || items.length === 0 || !customerInfo.name || !customerInfo.phone) {
            return NextResponse.json({ error: 'Missing required order details' }, { status: 400 });
        }

        // Recalculate total server-side from item prices — never trust client total
        const DELIVERY_FEE = 40000;
        const itemsTotal = items.reduce((sum: number, item: any) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
        const serverTotal = itemsTotal + (deliveryInfo.delivery_type === 'delivery' ? DELIVERY_FEE : 0);

        // 0. Intercept Base64 strings and upload them to Storage before saving to DB
        // Support multiple possible photo keys from builder
        if (items && items.length > 0) {
            const uploadTasks: Promise<void>[] = [];
            for (const item of items) {
                if (!item.configuration) continue;
                
                // 0. Intercept Base64 strings and upload them to Storage before saving to DB
                // Support multiple possible photo keys from builder
                const photoKeys = ['uploaded_photo_url', 'photo_ref', 'photoRef'];
                
                // 1. Process individual keys
                for (const key of photoKeys) {
                    if (item.configuration[key]?.startsWith('data:image')) {
                        uploadTasks.push(
                            uploadBase64Image(supabaseAdmin, item.configuration[key], staffIdHeader || 'staff', 'photo')
                                .then(url => { if (url) item.configuration[key] = url; })
                        );
                    }
                }

                // 2. Process photo_refs array (New implementation)
                if (Array.isArray(item.configuration.photo_refs)) {
                    item.configuration.photo_refs.forEach((ref: any, idx: number) => {
                        if (typeof ref === 'string' && ref.startsWith('data:image')) {
                            uploadTasks.push(
                                uploadBase64Image(supabaseAdmin, ref, staffIdHeader || 'staff', `photo_${idx}`)
                                    .then(url => { 
                                        if (url && item.configuration.photo_refs) {
                                            item.configuration.photo_refs[idx] = url;
                                        }
                                    })
                            );
                        }
                    });
                }

                if (item.configuration.drawing?.startsWith('data:image')) {
                    uploadTasks.push(
                        uploadBase64Image(supabaseAdmin, item.configuration.drawing, staffIdHeader || 'staff', 'drawing')
                            .then(url => { if (url) item.configuration.drawing = url; })
                    );
                }
            }
            if (uploadTasks.length > 0) await Promise.all(uploadTasks);
        }

        // 1. Prepare data for RPC
        const orderData = {
            total_price: serverTotal,
            delivery_address: deliveryInfo.delivery_type === 'delivery' ? { street: deliveryInfo.address } : null,
            delivery_time: deliveryInfo.date,
            delivery_slot: deliveryInfo.slot,
            delivery_type: deliveryInfo.delivery_type,
            branch_id: deliveryInfo.branch_id,
            comment: orderNote || 'Manual Order entry via POS'
        };

        // 2. Call RPC
        const { data, error } = await supabaseAdmin.rpc('create_pos_order', {
            p_staff_id: staffIdHeader,
            p_customer_name: customerInfo.name,
            p_customer_phone: customerInfo.phone,
            p_order_data: orderData,
            p_items: items.map((item: any) => ({
                product_id: item.id === '00000000-0000-0000-0000-000000000000' ? null : item.id,
                name: item.name,
                quantity: item.quantity,
                unit_price: item.price,
                configuration: item.configuration ?? {
                    portion: item.portion || undefined,
                    flavor: item.flavor || undefined,
                    custom_note: item.customNote || undefined,
                    image_url: item.image || undefined
                }
            })),
            p_created_by_name: creatorNameHeader
        });

        if (error) {
            console.error('[POS API] RPC Error:', error);
            throw error;
        }

        // 3. Trigger Telegram Notification to Admin Group
        // Await to ensure delivery in serverless environments
        try {
            await notifyAdminNewOrder(data.id);
        } catch (err) {
            console.error('[POS API] Notification error:', err);
        }

        return NextResponse.json({ success: true, orderId: data.id });
    } catch (error: any) {
        console.error('[POS API] Create error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
