export type AdminOrderItemConfiguration = {
    uploaded_photo_url?: string | null;
    drawing?: string | null;
    portion?: string | null;
    mode?: string | null;
    flavor?: string | null;
    shape?: string | null;
    sponge?: string | null;
    decorations?: string | null;
    custom_note?: string | null;
    order_note?: string | null;
    [key: string]: unknown;
};

export type AdminOrderItem = {
    id: string;
    product_id?: string | null;
    name: string;
    quantity: number;
    unit_price?: number;
    configuration?: AdminOrderItemConfiguration | null;
    products?: {
        image_url?: string | null;
        category_id?: string | null;
    } | null;
};

export type AdminOrder = {
    id: string;
    status: string;
    total_price: number;
    delivery_time: string;
    delivery_slot: string;
    created_at: string;
    comment?: string | null;
    user_id?: string | null;
    delivery_address?: {
        street?: string | null;
        apartment?: string | null;
        lat?: number | null;
        lng?: number | null;
        [key: string]: unknown;
    } | null;
    profiles?: {
        full_name?: string | null;
        phone_number?: string | null;
    } | null;
    delivery_type?: 'delivery' | 'pickup' | null;
    branch_id?: string | null;
    branches?: {
        name_uz?: string | null;
        name_ru?: string | null;
        address_uz?: string | null;
        address_ru?: string | null;
        location_link?: string | null;
    } | null;
    customer_name?: string | null;
    customer_phone?: string | null;
    created_by_name?: string | null;
    last_updated_by_name?: string | null;
    cancellation_reason?: string | null;
    payment_method?: 'cash' | 'card' | null;
    coins_spent?: number | null;
    promo_discount?: number | null;
    order_items?: AdminOrderItem[] | null;
};

export type AdminOrderListItem = {
    id: string;
    status: string;
    total_price: number;
    delivery_time: string;
    delivery_slot: string;
    created_at: string;
    comment?: string | null;
    delivery_type?: AdminOrder['delivery_type'];
    branch_id?: AdminOrder['branch_id'];
    branches?: AdminOrder['branches'];
    delivery_address?: AdminOrder['delivery_address'];
    profiles?: AdminOrder['profiles'];
    customer_name?: string | null;
    customer_phone?: string | null;
    created_by_name?: string | null;
    last_updated_by_name?: string | null;
    payment_method?: 'cash' | 'card' | null;
    coins_spent?: number | null;
    promo_discount?: number | null;
    order_items?: AdminOrderItem[] | null;
    items_count?: number;
};

export type AdminOrderCardData = AdminOrder | AdminOrderListItem;
