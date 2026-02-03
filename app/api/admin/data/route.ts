import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

// Service Role client - module-level singleton for performance
const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// INSTANT admin check - just reads header set by middleware
// No auth calls, no database queries!
async function isAdminVerified(): Promise<boolean> {
    const headersList = await headers();
    return headersList.get('x-admin-verified') === 'true';
}

// Allowed tables for admin operations
const ALLOWED_TABLES = [
    'products', 'categories', 'orders', 'order_items',
    'availability_overrides', 'custom_cake_options',
    'banners', 'config', 'reward_transactions', 'profiles',
    'app_settings', 'coin_transactions'
];

export async function GET(request: NextRequest) {
    if (!await isAdminVerified()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');
    const select = searchParams.get('select') || '*';
    const orderBy = searchParams.get('orderBy');
    const orderAsc = searchParams.get('orderAsc') === 'true';
    const filterColumn = searchParams.get('filterColumn');
    const filterValue = searchParams.get('filterValue');

    if (!table || !ALLOWED_TABLES.includes(table)) {
        return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }

    let query = serviceClient.from(table).select(select);

    if (filterColumn && filterValue) {
        query = query.eq(filterColumn, filterValue);
    }

    if (orderBy) {
        query = query.order(orderBy, { ascending: orderAsc });
    }

    const { data, error } = await query;

    if (error) {
        console.error(`[Admin API] Error fetching ${table}:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
    if (!await isAdminVerified()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { table, data: insertData } = body;

    if (!table || !ALLOWED_TABLES.includes(table)) {
        return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }

    const { data, error } = await serviceClient.from(table).insert(insertData).select();

    if (error) {
        console.error(`[Admin API] Error inserting into ${table}:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
}

export async function PUT(request: NextRequest) {
    if (!await isAdminVerified()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { table, id, data: updateData } = body;

    if (!table || !ALLOWED_TABLES.includes(table)) {
        return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }

    const { data, error } = await serviceClient.from(table).update(updateData).eq('id', id).select();

    if (error) {
        console.error(`[Admin API] Error updating ${table}:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest) {
    if (!await isAdminVerified()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');
    const id = searchParams.get('id');

    if (!table || !ALLOWED_TABLES.includes(table)) {
        return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }

    const { error } = await serviceClient.from(table).delete().eq('id', id);

    if (error) {
        console.error(`[Admin API] Error deleting from ${table}:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
