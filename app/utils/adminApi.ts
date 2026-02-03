// Admin API helper - fetches data using Service Role Key (bypasses RLS)

type AdminFetchOptions = {
    table: string;
    select?: string;
    orderBy?: string;
    orderAsc?: boolean;
    filterColumn?: string;
    filterValue?: string;
};

export async function adminFetch<T = any>(options: AdminFetchOptions): Promise<T[]> {
    const params = new URLSearchParams({
        table: options.table,
        select: options.select || '*',
    });

    if (options.orderBy) {
        params.set('orderBy', options.orderBy);
        params.set('orderAsc', String(options.orderAsc ?? false));
    }

    if (options.filterColumn && options.filterValue) {
        params.set('filterColumn', options.filterColumn);
        params.set('filterValue', options.filterValue);
    }

    const response = await fetch(`/api/admin/data?${params.toString()}`, {
        credentials: 'include'
    });

    if (!response.ok) {
        console.error('[adminFetch] Error:', response.status);
        return [];
    }

    const { data } = await response.json();
    return data || [];
}

export async function adminInsert<T = any>(table: string, insertData: any): Promise<T | null> {
    const response = await fetch('/api/admin/data', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, data: insertData })
    });

    if (!response.ok) {
        console.error('[adminInsert] Error:', response.status);
        return null;
    }

    const { data } = await response.json();
    return data?.[0] || null;
}

export async function adminUpdate<T = any>(table: string, id: string, updateData: any): Promise<T | null> {
    const response = await fetch('/api/admin/data', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, id, data: updateData })
    });

    if (!response.ok) {
        console.error('[adminUpdate] Error:', response.status);
        return null;
    }

    const { data } = await response.json();
    return data?.[0] || null;
}

export async function adminDelete(table: string, id: string): Promise<boolean> {
    const response = await fetch(`/api/admin/data?table=${table}&id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
    });

    if (!response.ok) {
        console.error('[adminDelete] Error:', response.status);
        return false;
    }

    return true;
}
