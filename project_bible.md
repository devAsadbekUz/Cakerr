# 🍰 Tashkent Cake Delivery System - Master Project Documentation

**Version:** 1.0
**Status:** In Progress (MVP Phase)
**Target Market:** Tashkent, Uzbekistan
**Language:** Uzbek (Latin script)

---

## 1. Project Overview
A premium, mobile-first Web Application (PWA) for a boutique bakery.
*   **Client Side:** Mobile-app-like experience for customers to browse, customize, and order cakes.
*   **Admin Side:** Desktop dashboard for the vendor to manage products and time slots.
*   **Telegram Bot:** Real-time order management (Receive -> Accept -> Cook -> Deliver).

## 2. Technology Stack
*   **Framework:** Next.js 14+ (App Router)
*   **Language:** TypeScript
*   **Styling:** Vanilla CSS (CSS Modules)
    *   *Constraint:* No Tailwind. "Premium" aesthetics with HSL variables.
    *   *Design System:* see `app/globals.css`.
*   **Database & Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime).
*   **PWA:** `@ducanh2912/next-pwa`.
*   **Icons:** `lucide-react`.
*   **Auth:** Phone Number via Supabase Auth (Integrate with **Eskiz** or **Firebase** for SMS).
*   **Payments:** Integration with **Payme** (or **Click**) API.
*   **Notifications:** Telegram Bot API (via `node-telegram-bot-api` or webhooks).

---

## 3. Architecture & Directory Structure
Current root: `/Users/a1234/Documents/Cakerr`

```
app/
├── (client)/          # Customer facing app (Mobile layout)
│   ├── page.tsx       # Home (Asosiy)
│   ├── sevimli/       # Favorites
│   ├── yaratish/      # Custom Cake Builder (Wizard)
│   ├── savat/         # Cart
│   ├── profil/        # User Profile
│   ├── mahsulot/      # Product Details ([id])
│   └── layout.tsx     # Includes BottomNav
├── (admin)/           # Vendor Dashboard (Desktop layout)
│   ├── admin/         # Dashboard Home
│   ├── layout.tsx     # Includes AdminSidebar
│   └── ...
├── components/        # Reusable UI
│   ├── home/          # Hero, Categories
│   ├── products/      # ProductCard, Grid
│   ├── layout/        # BottomNav
│   └── admin/         # AdminSidebar
└── globals.css        # Global variables (Colors, Reset)
```

---

## 4. Feature Specifications

### A. Client App (Mobile PWA)
1.  **Home (Asosiy)** [DONE]:
    *   Hero Banner (Promos).
    *   Category Filter (Scrollable).
    *   Product Grid (Rich cards with "Like" and "Add" buttons).
2.  **Product Details** [DONE]:
    *   Route: `/mahsulot/[id]`.
    *   Full-screen image with "Sheet" overlay.
    *   Portion Selection (2, 4, 6 kishilik).
    *   Sticky "Add to Cart" bar.
3.  **Custom Cake Builder (Yaratish)** [TODO]:
    *   **Step 1: Shape** (Round, Square, Heart).
    *   **Step 2: Size** (Small, Medium, Large).
    *   **Step 3: Sponge** (Vanilla, Chocolate, Red Velvet).
    *   **Step 4: Cream** (Choco, Berry, Cheese).
    *   **Step 5: Decoration** (Fruits, Macarons - selectable grid).
    *   **Step 6: Text/Drawing** (Canvas API to draw on cake outline).
4.  **Cart & Checkout (Buyurtmani rasmiylashtirish)** [TODO]:
    *   **Route:** `/savat/checkout`.
    *   **UI Structure:**
        *   **Header:** Pink with distinct Back button title.
        *   **Address Section (Yetkazib berish manzili):** Address input field with "+ Saqlash" button.
        *   **Date & Time (Yetkazib berish vaqti):**
            *   Date Picker ("Kunni tanlang").
            *   **Time Slots Grid:** Selectable pills (e.g., 09:00-11:00, 11:00-13:00, 13-15, 15-17, 17-19, 19-21).
            *   *Logic:* Slots crosslined/disabled if `current_orders >= max_capacity`.
        *   **Comment (Qo'shimcha izoh):**
            *   Textarea for "Eshik qo'ng'irog'i...".
            *   **Voice Note:** Microphone icon to record audio instructions (Telegram style). Uploads to Supabase Storage.
        *   **Gift Mode (Sovg'a rejimi) - "Wow" Feature:**
            *   *Action:* Checkbox "Sovg'a sifatida yuborish".
            *   *UI:* Hides Price from Recipient.
            *   *Input:* Sender enters Recipient's **Phone Number** only.
            *   *Flow:* Recipient gets SMS -> Opens Link -> Picks Address & Time -> Order Confirmed.
        *   **Footer Summary:** Sticky bottom sheet with breakdown (Mahsulotlar, Yetkazib berish, Jami) and "Buyurtmani tasdiqlash" button.
    *   **Payment:**
        *   **Cash:** Default selection.
        *   **Payme/Click:** Redirect to payment gateway.
5.  **Profile & Auth** [TODO]:
    *   **Header:** Pink background with User Avatar, Name, Phone, and Edit button.
    *   **Stats Card:** Floating card showing "Buyurtmalar" count and "Coins" (Loyalty Program).
    *   **Quick Reorder (Tez buyurtma):**
        *   *UI:* Card with Product Thumb, Title, Date (e.g., "2025-12-18"), Price.
        *   *Action:* Big Pink Button "Qayta buyurtma" (Reorder).
        *   *Logic:* Duplicates the items from the last order into a new checkout session.
    *   **Menu List:**
        *   Buyurtmalar tarixi (Order History).
            *   **Route:** `/orders`.
            *   **Filters:** Pills (Hammasi, Kutilmoqda, Tasdiqlangan).
            *   **List Item:** Card with Order ID, Date, Thumbnail, Total Price.
            *   **Actions:** "Qayta buyurtma qilish" (Reorder) button on past orders.
        *   **Order Details View:**
            *   **Route:** `/orders/[id]`.
            *   **UI:** Status Card (Confirmed/Delivered), Order Date, Product List, Payment Breakdown, Delivery Address (Map icon), Payment Method (Pink icon).
            *   **Footer Actions:** "Orqaga" (Back) and "Kuzatish" (Track - if active).
        *   Yetkazib berish manzili (Address Management).
        *   Ilovani ulashish (Share App).
    *   **Login:** Phone Number + SMS (Eskiz/Firebase).

### B. Admin Dashboard (Desktop)
1.  **Dashboard** [DONE]: Stats overview.
2.  **Product Management** [TODO]:
    *   CRUD operations for cakes.
    *   Image Upload (Supabase Storage).
3.  **Time Slot Management** [TODO]:
    *   **Critical Feature:** Vendor **crud (create/read/update/delete)** slots (e.g., "10:00-12:00").
    *   Vendor can **block/unblock** specific slots manually for specific dates.
    *   Slots auto-block if max capacity reached.

### C. Telegram Bot Integration (Vendor Ops)
*   **New Order:** Bot sends message to Vendor Channel/Group.
    *   *Message:* "New Order #123. Chocolate Cake. 228,000 sum. Location: [Link]."
    *   *Buttons:* [Accept], [Reject].
*   **Workflow:**
    *   Vendor clicks [Accept] -> Status updates to "Accepted" in DB -> User notified.
    *   Vendor clicks [Start Cooking] -> Status: "Cooking".
    *   Vendor clicks [Ready] -> Status: "Ready".
    *   Vendor clicks [On Way] -> Status: "Delivery".

---

## 5. Database Schema (Supabase - Planned)

### `profiles` (Users)
*   `id` (uuid, PK)
*   `phone` (text, unique)
*   `full_name` (text)
*   `role` (enum: 'admin', 'customer')

### `products`
*   `id` (uuid, PK)
*   `title` (text)
*   `price` (int) - Base price or default price.
*   `image_url` (text)
*   `category` (text)
*   `is_customizable` (bool)
*   `variants` (jsonb) - Array of `{ label: string, price: number }` (Admin-managed sizes).

### `orders`
*   `id` (uuid, PK)
*   `user_id` (fk)
*   `status` (enum: 'new', 'accepted', 'cooking', 'ready', 'delivering', 'delivered', 'cancelled')
*   `total_price` (int)
*   `delivery_time_slot` (text)
*   `payment_method` (text)
*   `created_at` (timestamp)

### `order_items`
*   `id` (uuid)
*   `order_id` (fk)
*   `product_id` (fk)
*   `quantity` (int)
*   `options` (jsonb - e.g., { portions: 6, flavor: 'choco' })

### `time_slots`
*   `id` (uuid)
*   `date` (date)
*   `start_time` (time)
*   `end_time` (time)
*   `is_blocked` (bool)

---

## 6. Implementation Roadmap for Agent

1.  **Phase 1: Database & Auth (The Brain)**
    *   Set up Supabase project.
    *   Create tables defined above.
    *   Implement Phone Auth (Supabase + SMS Provider).

2.  **Phase 2: Complete Client Flows**
    *   Implement "Yaratish" (Custom Builder) Wizard state machine.
    *   Implement Cart & Checkout with Time Slot fetcher.

3.  **Phase 3: Admin & Ops**
    *   Build Admin "Product Add" Form.
    *   Build Admin "Time Slot" Calendar.

4.  **Phase 4: Integrations**
    *   Set up Telegram Bot Webhook (Next.js API route `/api/telegram`).
    *   Connect Payme API.

---

## 7. UX/UI Guidelines ("Rich Aesthetics")
*   **Colors:** Deep Pink/Red (`#E91E63`) for actions, Soft Cream (`#F9FAFB`) backgrounds.
*   **Shadows:** Soft, diffused shadows (`0 4px 20px rgba(...)`).
*   **Radius:** Heavy rounding (`20px - 32px`).
*   **Interaction:** Active states on all buttons (scale down).

---

## 8. API Specification (REST & Supabase RPC)

### A. Authentication
*   **POST** `/auth/v1/otp`
    *   *Purpose:* Send SMS OTP.
    *   *Body:* `{ "phone": "+998901234567" }`
*   **POST** `/auth/v1/verify`
    *   *Purpose:* Verify OTP and return session.
    *   *Body:* `{ "phone": "...", "token": "123456" }`

### B. Products
*   **GET** `/rest/v1/products?select=*`
    *   *Query:* `category=eq.birthday`
    *   *Response:* List of products.
*   **GET** `/rest/v1/products?id=eq.{uuid}`
    *   *Response:* Single product details.

### C. Orders
*   **POST** `/rest/v1/orders`
    *   *Purpose:* Create new order.
    *   *Body:*
        ```json
        {
          "user_id": "uuid",
          "total_price": 228000,
          "items": [
            { "product_id": "uuid", "quantity": 1, "options": { "portion": 6 } }
          ],
          "delivery_time_slot": "2024-12-20 14:00-16:00",
          "location": { "lat": 41.2, "lng": 69.2 }
        }
        ```
*   **GET** `/rest/v1/orders?user_id=eq.{uuid}`
    *   *Purpose:* Get user history.

### D. Vendor Ops (RPC Functions)
*   **POST** `/rpc/accept_order`
    *   *Body:* `{ "order_id": "uuid" }`
    *   *Logic:* Updates status -> Triggers Notification.
*   **POST** `/rpc/update_time_slots`
    *   *Body:* `{ "date": "2024-12-20", "blocked": ["10-12"] }`

### E. Telegram Webhook
*   **POST** `/api/telegram`
    *   *Purpose:* Receive updates from Telegram Bot.
    *   *Logic:* Parse message -> Match with Order ID -> Update Status if action button clicked.

---

---

## 9. Future Roadmap (Post-MVP)

1.  **Referral System (Growth):**
    *   *Idea:* "Invite a Friend, Get 10k Coins".
    *   *Mechanism:* Unique link generation. Friend gets discount, referrer gets coins.
2.  **Dynamic Delivery Pricing:**
    *   *Idea:* Integrate Yandex Maps API.
    *   *Logic:* Calculate price based on km distance (e.g., Base + 2000 sum/km).
    *   *Goal:* Protect margins on long-distance delivery.

---

**End of Documentation**
