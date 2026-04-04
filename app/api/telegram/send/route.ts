import { NextRequest, NextResponse } from 'next/server';
import { notifyAdminNewOrder } from '@/app/services/telegramNotificationService';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { orderId } = body;

        if (!orderId) {
            return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
        }

        // Logic refactored to centralized service for POS and Web alignment
        const success = await notifyAdminNewOrder(orderId);

        if (!success) {
            return NextResponse.json({ error: 'Telegram Notification Failed' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[Telegram Send API] Fatal error:', error);
        return NextResponse.json({ 
            error: 'Internal server error', 
            message: error.message 
        }, { status: 500 });
    }
}
