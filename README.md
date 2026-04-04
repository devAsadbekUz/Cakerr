# 🍰 TORTEL'E - Custom Cake Ordering Platform

A modern PWA for ordering custom cakes with a realtime Telegram integration for vendors.

## 🚀 Live Demo
[https://tortele.uz](https://tortele.uz)

## ✅ Features Implemented (MVP)
### Client Side
- **Cake Builder**: Customize shape, layers, and decor.
- **Checkout**: Delivery address (Map), Date/Time slots.
- **Auth**: Email Magic Links via Supabase.
- **Tracking**: Real-time order status updates.

### Vendor Side (Admin)
- **Dashboard**: Manage orders, products, and prices.
- **Telegram Bot**: `@shrn_buyurtma_bot`
  - Receive instant order alerts.
  - View Google Maps location.
  - Update status (Confirm -> Prepare -> Deliver) via buttons.

---

## 🚧 Roadmap to Commercial Launch v1.0

### 1. Payment Integration (Critical)
Currently, the system uses **Cash on Delivery**.
- **Task**: Integrate **Payme** or **Click** API to accept real payments.

### 2. SMS Authentication (UX)
Currently, users log in via **Email**.
- **Task**: Switch to **Eskiz (SMS)** or Firebase Phone Auth for better adoption in Uzbekistan.

### 3. Custom Domain
- **Task**: Deploy to `tortele.uz` (purchase domain and link to Vercel).

### 4. Advanced Features
- **"Sovg'a" Mode**: Gift ordering flow.
- **Voice Notes**: Audio instructions in checkout.

## 🛠 Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **State**: Context API
- **Maps**: Leaflet / OpenStreetMap
- **Styling**: CSS Modules
