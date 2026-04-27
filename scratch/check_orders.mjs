import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    console.log('Checking orders for Asadbek...');
    
    // 1. Find profile
    const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', '%Asadbek%');
    
    console.log('Profiles found:', profiles?.length || 0);
    if (!profiles?.length) return;

    const profileIds = profiles.map(p => p.id);
    
    // 2. Find orders
    const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .in('user_id', profileIds)
        .order('created_at', { ascending: false });

    console.log('Orders found:', orders?.length || 0);
    orders?.forEach(o => {
        console.log(`Order ID: ${o.id}, Status: ${o.status}, Created: ${o.created_at}, Total: ${o.total_price}`);
    });
}

check();
