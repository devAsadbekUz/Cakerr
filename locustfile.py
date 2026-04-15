"""
Cakerr — Locust Performance Test
=================================
Run with:
  locust -f locustfile.py --host https://YOUR-DOMAIN.vercel.app

Then open http://localhost:8089 in your browser.

Before running, set your real values below:
  TG_INIT_DATA  — get this by opening the mini app on your phone,
                  opening Telegram DevTools, and running:
                  window.Telegram.WebApp.initData
  PRODUCT_ID    — any real product UUID from your Supabase products table
  ADMIN_COOKIE  — your admin session cookie value (from browser DevTools
                  → Application → Cookies → admin_token)
"""

import os
import json
import random
from locust import HttpUser, task, between, tag

# ─── CONFIG — replace these with real values ────────────────────────────────
TG_INIT_DATA = os.getenv("TG_INIT_DATA", "PASTE_YOUR_TELEGRAM_INIT_DATA_HERE")
PRODUCT_ID   = os.getenv("PRODUCT_ID",   "PASTE_A_REAL_PRODUCT_UUID_HERE")
ADMIN_COOKIE = os.getenv("ADMIN_COOKIE", "PASTE_YOUR_ADMIN_TOKEN_COOKIE_HERE")
# ─────────────────────────────────────────────────────────────────────────────

CLIENT_HEADERS = {
    "Content-Type": "application/json",
    "X-Telegram-Init-Data": TG_INIT_DATA,
}

ADMIN_HEADERS = {
    "Content-Type": "application/json",
    "Cookie": f"admin_token={ADMIN_COOKIE}",
}


# ═══════════════════════════════════════════════════════════════════════════
# USER 1: Regular client — browses, adds to cart, checks out
# ═══════════════════════════════════════════════════════════════════════════
class ClientUser(HttpUser):
    """
    Simulates a real Telegram Mini App user going through the order flow.
    wait_time = pause between tasks (realistic human behaviour).
    """
    weight = 9          # 90% of simulated users are clients
    wait_time = between(2, 5)

    # ── 1. Load cart (happens every time the app opens) ───────────────────
    @task(5)
    @tag("cart", "read")
    def view_cart(self):
        with self.client.get(
            "/api/user/cart",
            headers=CLIENT_HEADERS,
            name="GET /api/user/cart",
            catch_response=True,
        ) as res:
            if res.status_code == 401:
                res.failure("Auth failed — initData likely expired")
            elif res.status_code != 200:
                res.failure(f"Unexpected {res.status_code}")

    # ── 2. Add a normal cake to cart ─────────────────────────────────────
    @task(4)
    @tag("cart", "write")
    def add_to_cart(self):
        payload = {
            "product_id": PRODUCT_ID,
            "quantity": 1,
            "portion": random.choice(["small", "medium", "large"]),
            "flavor": random.choice(["chocolate", "vanilla", "strawberry"]),
        }
        with self.client.post(
            "/api/user/cart",
            headers=CLIENT_HEADERS,
            json=payload,
            name="POST /api/user/cart (normal)",
            catch_response=True,
        ) as res:
            if res.status_code == 401:
                res.failure("Auth failed")
            elif res.status_code not in (200, 201):
                res.failure(f"Unexpected {res.status_code}: {res.text[:200]}")

    # ── 3. Validate a promo code (common at checkout) ────────────────────
    @task(3)
    @tag("checkout", "promo")
    def validate_promo(self):
        with self.client.post(
            "/api/promo/validate",
            headers=CLIENT_HEADERS,
            json={"code": "TESTPROMO", "subtotal": 150000},
            name="POST /api/promo/validate",
            catch_response=True,
        ) as res:
            # 404 = code not found — acceptable, not a failure
            if res.status_code == 500:
                res.failure("Server error on promo validate")
            else:
                res.success()

    # ── 4. Place a full order (the most expensive path) ──────────────────
    @task(2)
    @tag("checkout", "order")
    def place_order(self):
        payload = {
            "order": {
                "delivery_address": {
                    "street": "Amir Temur ko'chasi 1",
                    "lat": 41.2995,
                    "lng": 69.2401,
                },
                "delivery_time": "2026-04-25",
                "delivery_slot": "12:00-14:00",
                "total_price": 150000,
                "delivery_type": "delivery",
                "payment_method": "cash",
            },
            "items": [
                {
                    "product_id": PRODUCT_ID,
                    "name": "Test Cake",
                    "quantity": 1,
                    "unit_price": 150000,
                }
            ],
            "coins_spent": 0,
        }
        with self.client.post(
            "/api/user/orders",
            headers=CLIENT_HEADERS,
            json=payload,
            name="POST /api/user/orders",
            catch_response=True,
        ) as res:
            if res.status_code == 401:
                res.failure("Auth failed")
            elif res.status_code not in (200, 201):
                res.failure(f"Order failed {res.status_code}: {res.text[:300]}")

    # ── 5. View order history ─────────────────────────────────────────────
    @task(3)
    @tag("orders", "read")
    def view_orders(self):
        with self.client.get(
            "/api/user/orders",
            headers=CLIENT_HEADERS,
            name="GET /api/user/orders",
            catch_response=True,
        ) as res:
            if res.status_code == 401:
                res.failure("Auth failed")
            elif res.status_code != 200:
                res.failure(f"Unexpected {res.status_code}")

    # ── 6. View favorites ─────────────────────────────────────────────────
    @task(2)
    @tag("favorites")
    def view_favorites(self):
        self.client.get(
            "/api/user/favorites",
            headers=CLIENT_HEADERS,
            name="GET /api/user/favorites",
        )

    # ── 7. View profile ───────────────────────────────────────────────────
    @task(1)
    @tag("profile")
    def view_profile(self):
        self.client.get(
            "/api/user/profile",
            headers=CLIENT_HEADERS,
            name="GET /api/user/profile",
        )


# ═══════════════════════════════════════════════════════════════════════════
# USER 2: Admin — checks dashboard and manages orders
# ═══════════════════════════════════════════════════════════════════════════
class AdminUser(HttpUser):
    """
    Simulates an admin refreshing the dashboard and processing orders.
    Admins act more slowly — they read and think between actions.
    """
    weight = 1          # 10% of simulated users are admins
    wait_time = between(5, 15)

    # ── 1. Load dashboard (most expensive query) ──────────────────────────
    @task(3)
    @tag("admin", "dashboard")
    def view_dashboard(self):
        with self.client.get(
            "/api/admin/dashboard?days=30",
            headers=ADMIN_HEADERS,
            name="GET /api/admin/dashboard",
            catch_response=True,
        ) as res:
            if res.status_code == 401:
                res.failure("Admin auth failed — check ADMIN_COOKIE")
            elif res.status_code != 200:
                res.failure(f"Dashboard error {res.status_code}")

    # ── 2. Load orders list ───────────────────────────────────────────────
    @task(4)
    @tag("admin", "orders")
    def view_orders(self):
        with self.client.get(
            "/api/admin/orders?summary=1",
            headers=ADMIN_HEADERS,
            name="GET /api/admin/orders",
            catch_response=True,
        ) as res:
            if res.status_code == 401:
                res.failure("Admin auth failed")
            elif res.status_code != 200:
                res.failure(f"Orders error {res.status_code}")

    # ── 3. Load custom cake options (used in cake builder) ────────────────
    @task(2)
    @tag("admin", "catalog")
    def view_custom_options(self):
        self.client.get(
            "/api/admin/custom-options",
            headers=ADMIN_HEADERS,
            name="GET /api/admin/custom-options",
        )
