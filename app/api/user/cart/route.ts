import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getVerifiedUserId } from '@/app/utils/telegram-auth';
import { z } from 'zod';

const supabaseService = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CartItemSchema = z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().min(1).optional().default(1),
    portion: z.string().optional().default(''),
    flavor: z.string().optional().default(''),
    custom_note: z.string().optional(),
    configuration: z.any().optional(),
});

const UpdateCartItemSchema = z.object({
    id: z.string().uuid(),
    quantity: z.number().int().min(1).optional(),
    custom_note: z.string().optional(),
    configuration: z.any().optional(),
});

const DeleteCartItemSchema = z.object({
    id: z.string().uuid().optional(),
    clearAll: z.boolean().optional(),
});

/**
 * Backend API for Cart management.
 * Optimized for Telegram Mini App and standard Web clients.
 */

export async function GET(request: NextRequest) {
    const userId = await getVerifiedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = supabaseService;

    try {
        const { data: items, error } = await supabase
            .from('cart_items')
            .select(`
                *,
                products (
                    title,
                    base_price,
                    image_url
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Map the joined data to a flatter structure if needed, or return as is
        return NextResponse.json({ cart: items || [] }, {
            headers: { 'Cache-Control': 'private, no-cache' },
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Helper function to upload Base64 images to Supabase Storage
async function uploadBase64Image(supabase: any, base64String: string, userId: string, prefix: string): Promise<string | null> {
    const fileName = `${userId}/${prefix}_${Date.now()}.png`; // Defaulting to png if split fails
    try {
        const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            console.error('[Storage] Invalid base64 format received');
            return null;
        }

        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        const ext = mimeType.split('/')[1] || 'png';
        const finalFileName = `${userId}/${prefix}_${Date.now()}.${ext}`;

        const { error } = await supabase.storage
            .from('custom-cakes')
            .upload(finalFileName, buffer, { 
                contentType: mimeType, 
                upsert: false,
                cacheControl: '3600'
            });

        if (error) {
            console.error('[Storage Upload Error] Bucket: custom-cakes, File:', finalFileName, error);
            return null;
        }

        const { data } = supabase.storage.from('custom-cakes').getPublicUrl(finalFileName);
        return data.publicUrl;
    } catch (err) {
        console.error('[Storage Upload Exception] Fatal error during upload processing:', err);
        return null;
    }
}

export async function POST(request: NextRequest) {
    const userId = await getVerifiedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = supabaseService;

    try {
        const raw = await request.json();

        // Image upload handling for Cart items
        const processItemImages = async (item: any) => {
            if (!item.configuration) return;
            const uploadTasks: Promise<void>[] = [];
            
            const photoKey = ['uploaded_photo_url', 'photo_ref', 'photoRef'].find(k => 
                item.configuration[k]?.startsWith('data:image')
            );
            if (photoKey) {
                uploadTasks.push(
                    uploadBase64Image(supabase, item.configuration[photoKey], userId, 'photo')
                        .then(url => { if (url) item.configuration[photoKey] = url; })
                );
            }
            if (item.configuration.drawing?.startsWith('data:image')) {
                uploadTasks.push(
                    uploadBase64Image(supabase, item.configuration.drawing, userId, 'drawing')
                        .then(url => { if (url) item.configuration.drawing = url; })
                );
            }
            if (uploadTasks.length > 0) await Promise.all(uploadTasks);
        };

        // Batch insert path: used during guest cart migration
        if (Array.isArray(raw)) {
            const parsed = z.array(CartItemSchema).safeParse(raw);
            if (!parsed.success) {
                return NextResponse.json({ error: 'Invalid batch data', details: parsed.error.flatten() }, { status: 400 });
            }
            
            // Batch upload all images in parallel
            await Promise.all(parsed.data.map(item => processItemImages(item)));

            const rows = parsed.data.map(item => ({
                user_id: userId,
                product_id: item.product_id,
                quantity: item.quantity,
                portion: item.portion,
                flavor: item.flavor,
                custom_note: item.custom_note,
                configuration: item.configuration,
            }));
            const { data: inserted, error } = await supabase
                .from('cart_items')
                .insert(rows)
                .select(`*, products (title, base_price, image_url)`);
            if (error) throw error;
            return NextResponse.json({ items: inserted });
        }

        const parsed = CartItemSchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid cart item data', details: parsed.error.flatten() }, { status: 400 });
        }

        const item = parsed.data;
        await processItemImages(item);
        
        const { product_id, quantity, portion, flavor, custom_note, configuration } = item;

        // Single atomic upsert via RPC — increments quantity if row exists, inserts otherwise.
        // Custom cakes (nil UUID) are always inserted as new rows (no conflict possible on product_id).
        const { data: upserted, error: upsertError } = await supabase
            .rpc('upsert_cart_item', {
                p_user_id: userId,
                p_product_id: product_id,
                p_quantity: quantity,
                p_portion: portion || '',
                p_flavor: flavor || '',
                p_custom_note: custom_note ?? null,
                p_configuration: configuration ?? null
            });

        if (upsertError) throw upsertError;

        // RPC now returns product fields in the same query — no second round-trip needed.
        const row = Array.isArray(upserted) ? upserted[0] : upserted;
        return NextResponse.json({
            item: {
                id: row.id,
                user_id: row.user_id,
                product_id: row.product_id,
                quantity: row.quantity,
                portion: row.portion,
                flavor: row.flavor,
                custom_note: row.custom_note,
                configuration: row.configuration,
                created_at: row.created_at,
                products: {
                    title: row.product_title,
                    base_price: row.product_base_price,
                    image_url: row.product_image_url,
                },
            },
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    const userId = await getVerifiedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = supabaseService;

    try {
        const raw = await request.json();
        const parsed = UpdateCartItemSchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid update data', details: parsed.error.flatten() }, { status: 400 });
        }
        const { id, quantity, configuration, custom_note } = parsed.data;

        // Image upload handling for PUT updates
        if (configuration) {
            const uploadTasks: Promise<void>[] = [];
            const photoKey = ['uploaded_photo_url', 'photo_ref', 'photoRef'].find(k => 
                configuration[k]?.startsWith('data:image')
            );
            if (photoKey) {
                uploadTasks.push(
                    uploadBase64Image(supabase, configuration[photoKey], userId, 'photo')
                        .then(url => { if (url) configuration[photoKey] = url; })
                );
            }
            if (configuration.drawing?.startsWith('data:image')) {
                uploadTasks.push(
                    uploadBase64Image(supabase, configuration.drawing, userId, 'drawing')
                        .then(url => { if (url) configuration.drawing = url; })
                );
            }
            if (uploadTasks.length > 0) await Promise.all(uploadTasks);
        }

        const { data: updated, error } = await supabase
            .from('cart_items')
            .update({ quantity, configuration, custom_note })
            .eq('id', id)
            .eq('user_id', userId)
            .select(`
                *,
                products (
                    title,
                    base_price,
                    image_url
                )
            `)
            .single();

        if (error) throw error;
        return NextResponse.json({ item: updated });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const userId = await getVerifiedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = supabaseService;

    try {
        const raw = await request.json();
        const parsed = DeleteCartItemSchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid delete data', details: parsed.error.flatten() }, { status: 400 });
        }
        const { id, clearAll } = parsed.data;

        if (clearAll) {
            const { error } = await supabase
                .from('cart_items')
                .delete()
                .eq('user_id', userId);
            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        if (!id) return NextResponse.json({ error: 'Item ID required' }, { status: 400 });

        const { error } = await supabase
            .from('cart_items')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
