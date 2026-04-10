import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
    if (!openaiClient) {
        openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return openaiClient;
}

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // max messages per window
const RATE_WINDOW = 60 * 1000; // 1 minute

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
        return false;
    }

    if (entry.count >= RATE_LIMIT) {
        return true;
    }

    entry.count++;
    return false;
}

async function getProducts() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
        .from('products')
        .select('title, subtitle, description, base_price, is_available, is_ready, variants, categories(label)')
        .eq('is_available', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[Chat API] Error fetching products:', error);
        return [];
    }

    return data || [];
}

function buildProductContext(products: any[]): string {
    if (products.length === 0) return 'Hozircha mahsulotlar mavjud emas.';

    return products.map((p, i) => {
        let info = `${i + 1}. ${p.title}`;
        if (p.subtitle) info += ` — ${p.subtitle}`;
        if (p.description) info += `\n   Tavsif: ${p.description}`;
        info += `\n   Narx: ${p.base_price?.toLocaleString()} so'm`;
        if (p.categories?.label) info += `\n   Kategoriya: ${p.categories.label}`;
        if (p.is_ready) info += `\n   ✅ Tayyor (tez yetkazib berish mumkin)`;

        if (Array.isArray(p.variants) && p.variants.length > 0) {
            const variantList = p.variants
                .map((v: any) => `${v.label}: ${v.price?.toLocaleString()} so'm`)
                .join(', ');
            info += `\n   Variantlar: ${variantList}`;
        }

        return info;
    }).join('\n\n');
}

const SYSTEM_PROMPT = `Sen TORTEL'E yordamchi botisan — premium tort va shirinliklar butigi uchun AI assistentsan.

### BIZNES HAQIDA MA'LUMOT:
- **Do'kon nomi:** TORTEL'E
- **Asoschi:** Shokhrukh Akhmedov
- **Telefon:** 90 187 78 79
- **Ish vaqti:** Har kuni 09:00 dan 21:00 gacha.
- **Yetkazib berish:** Faqat Toshkent shahri ichida yetkazib beramiz.
- **To'lov usullari:** Naqd pul (kurerga), Payme va Click tizimlari orqali.
- **Buyurtma:** Sayt orqali yoki Telegram botimiz orqali amalga oshiriladi.

### FILIALLARIMIZ (Toshkent):
1. **Parkentskiy:** [Xaritada ko'rish](https://www.google.com/maps/place/Tortele/@41.3084839,69.334036,772m/data=!3m2!1e3!4b1!4m6!3m5!1s0x38aef5c1a1007471:0x3d33804566fe9059!8m2!3d41.3084839!4d69.3366109!16s%2Fg%2F11qpxmv3hf)
2. **Yunusobod, Shahriston:** [Xaritada ko'rish](https://www.google.com/maps/place/Tortel'ye/@41.3513853,69.2852025,93m/data=!3m1!1e3!4m14!1m7!3m6!1s0x38aef5c1a1007471:0x3d33804566fe9059!2sTortele!8m2!3d41.3084839!4d69.3366109!16s%2Fg%2F11qpxmv3hf!3m5!1s0x38ae8d003e65377d:0xc9af0805328231c9!8m2!3d41.3515658!4d69.2852991!16s%2Fg%2F11yq019wh0)

### ASOSIY QOIDALAR:
- Faqat tortlar, shirinliklar va bizning do'konimiz haqida gapir. 
- Boshqa mavzularga javob berma — "Men faqat TORTEL'E do'koni va tortlar bo'yicha yordam bera olaman" deb javob ber.
- Mehribon, professional va samimiy bo'l.
- Narxlarni faqat so'mda ko'rsat.
- O'zbek tilida gapir, lekin mijoz boshqa tilda yozsa (ruscha/inglizcha), o'sha tilda javob qaytar.
- Mahsulot haqida aniq ma'lumot bo'lmasa, to'qib chiqarma. "Bu haqida aniq ma'lumotim yo'q, lekin do'konimiz bilan bog'lanib aniqlashtirishingiz mumkin" deb ayt.

Quyida bizning mahsulotlarimiz ro'yxati (bu ma'lumotlarga asoslanib mijozga tavsiyalar ber):
`;

export async function POST(request: NextRequest) {
    try {
        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: 'Juda ko\'p so\'rov. Iltimos, bir daqiqa kutib turing.' },
                { status: 429 }
            );
        }

        const { messages } = await request.json();

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                { error: 'Xabar yuborilmadi' },
                { status: 400 }
            );
        }

        // Only keep last 10 messages to control token usage
        const recentMessages = messages.slice(-10);

        // Fetch live products from database
        const products = await getProducts();
        const productContext = buildProductContext(products);

        const systemMessage = SYSTEM_PROMPT + productContext;

        // Call OpenAI with streaming
        const stream = await getOpenAI().chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemMessage },
                ...recentMessages.map((m: any) => ({
                    role: m.role as 'user' | 'assistant',
                    content: m.content,
                })),
            ],
            max_tokens: 500,
            temperature: 0.7,
            stream: true,
        });

        // Create a ReadableStream for the response
        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                        }
                    }
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();
                } catch (error) {
                    console.error('[Chat API] Stream error:', error);
                    controller.error(error);
                }
            },
        });

        return new Response(readableStream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error: any) {
        console.error('[Chat API] Error:', error);

        if (error?.status === 401) {
            return NextResponse.json(
                { error: 'OpenAI API kaliti noto\'g\'ri. Iltimos, administratorga murojaat qiling.' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: 'Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.' },
            { status: 500 }
        );
    }
}
