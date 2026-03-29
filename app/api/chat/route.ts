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

const SYSTEM_PROMPT = `Sen TORTEL'E yordamchi botisan — tort va shirinliklar do'koni uchun AI assistentsan.

MUHIM QOIDALAR:
- Faqat tortlar, shirinliklar, buyurtma berish va do'kon haqida gapir
- Boshqa mavzularga javob berma — "Men faqat tortlar va buyurtmalar bo'yicha yordam bera olaman" de
- Mehribon, professional va qisqa javob ber
- Narxlarni so'mda ko'rsat
- Agar mijoz tort tanlashga yordam so'rasa, unga mos variantlarni taklif qil
- O'zbek tilida gapir, lekin agar mijoz ruscha yoki inglizcha yozsa, o'sha tilda javob ber
- Agar mahsulot haqida aniq ma'lumot bo'lmasa, to'qib chiqarma — "Bu haqida aniq ma'lumotim yo'q" de

Quyida bizning mahsulotlarimiz ro'yxati:
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
