# 🛍️ Shopify to Kwickbot (AI WhatsApp Support Bot) Integration Guide
## Official Step-by-Step Connection & Setup Documentation

This guide provides the complete, production-verified procedure for connecting an active **Shopify Store** with the **Kwickbot AI WhatsApp Support Bot**. It covers custom app provisioning, Admin API permission scopes, access token retrieval, Kwickbot store setup, and real-time webhook configuration.

---

## 📋 Prerequisites

Before beginning the connection process, ensure you have:
1. **Shopify Store Admin Access:** Logged in with Store Owner or Staff credentials with App Development permissions.
2. **Completed Kwickbot Profile:** In your Kwickbot Merchant Portal -> **Profile**, verify that **Store Name**, **Store Phone**, and **Support Email** are configured.
3. **Shopify Store Subdomain:** Your store's default `*.myshopify.com` domain (e.g., `your-store-name.myshopify.com`). Custom domains (like `brand.com`) should not be used for API connection.

---

## 🛠️ Step 1: Open Shopify Settings
1. Log in to your **Shopify Store Admin** (`https://admin.shopify.com`).
2. In the bottom-left corner of the sidebar, click on the **Settings (gear icon ⚙️)**.

---

## 📱 Step 2: Navigate to Apps and Sales Channels
1. In the Settings side menu, locate and click on **Apps and sales channels**.

---

## 💻 Step 3: Access Custom App Development
1. In the top-right header, click the **Develop apps** button.
   > *Note: If this is your first time developing apps on this store, click "Allow custom app development" and confirm.*

---

## ➕ Step 4: Create App Instance
1. Click the **Create an app** button.
2. In the dialog modal:
   - **App name:** `Kwickbot WhatsApp Bot`
   - **App developer:** Select your email address.
3. Click **Create app**.

---

## ⚙️ Step 5: Configure Admin API Scopes
1. On the app overview page, select the **Configuration** tab.
2. In the **Admin API integration** section, click the **Configure** button.

---

## 🔒 Step 6: Select Access Permissions
1. Use the search bar to locate and check the following permission scopes:
   - [x] **`read_orders`** — Enables order lookup, status verification, and tracking.
   - [x] **`read_products`** — Enables AI chatbot product catalog answers.
   - [x] **`read_customers`** — Syncs customer names and phone numbers for WhatsApp messaging.
   - [x] **`read_fulfillments`** — Fetches courier tracking numbers and shipping statuses.
   - [x] **`read_draft_orders`** *(Optional)* — Used for abandoned cart recovery workflows.
2. Scroll to the bottom and click **Save**.

> ⚠️ **Critical Requirement (Protected Customer Data):**
> Under App settings / Configuration, ensure **Protected Customer Data** is approved for **"Order management"** and **"Customer support / communication"**. Without this, Shopify redacts customer phone numbers, preventing automated WhatsApp notifications.

---

## 🚀 Step 7: Install Custom App
1. Return to the top of the app overview tab.
2. In the top-right corner, click on the green **Install app** button.

---

## ✅ Step 8: Confirm App Installation
1. Review the API access scope summary.
2. Click **Install** in the confirmation modal dialog.

---

## 🔑 Step 9: Navigate to API Credentials
1. Click on the **API credentials** tab.
2. Locate the **Admin API access token** card.

---

## 👁️ Step 10: Reveal Access Token Once
1. Click on the **Reveal token once** link to display your secure token.
   > ⚠️ **Warning:** Shopify reveals this token **only once**. If the page is reloaded, it cannot be displayed again.

---

## 📋 Step 11: Copy Admin Access Token
1. Copy the revealed token starting with **`shpat_`** (e.g., `shpat_xxxxxxxxxxxxxxxxxxxxxxxx`).
   > ⚠️ **Do Not Copy the API Secret Key:** Ensure you copy the **Admin API access token** (`shpat_...`) and not the API secret key (`shpss_...`).

---

## 🌐 Step 12: Note API Keys & Store Domain
1. Confirm your default store subdomain (e.g., `yourstore.myshopify.com`).
2. Keep your Admin API access token ready for input.

---

## 🖥️ Step 13: Open Kwickbot Merchant Dashboard
1. Log in to your **Kwickbot Merchant Dashboard** (`http://localhost:3000/dashboard`).
2. In the left navigation sidebar, click on **Integrations**.
3. Locate the **Shopify** card and click **Connect Shopify**.

---

## 🔗 Step 14: Input Store URL & Admin Token
1. In the connection form, enter:
   - **Store Name:** Your brand name (e.g., `My Store`).
   - **Store URL:** `your-store-name.myshopify.com` (or `https://your-store-name.myshopify.com`).
   - **Admin API Access Token:** Paste the `shpat_...` token copied in Step 11.
2. Click **Connect Shopify**.
3. Kwickbot will verify the token, initialize the integration record, and execute an initial order sync.

---

## ⚡ Step 15: Retrieve Webhook URL & Review Synced Orders
1. After connecting, Kwickbot displays your unique **Webhook URL**:
   - `https://<YOUR_BACKEND_URL>/api/webhooks/shopify/orders`
2. Navigate to the **Orders** tab to verify imported Shopify orders.

---

## 🔔 Step 16: Configure Webhooks in Shopify Settings
1. In **Shopify Store Admin**, navigate to **Settings (⚙️)** -> **Notifications**.
2. Scroll to the bottom to the **Webhooks** section.
3. Click **Create webhook**:
   - **Event:** `Order creation`
   - **Format:** `JSON`
   - **URL:** Paste your Kwickbot Orders Webhook URL.
   - **Webhook API version:** `Latest`
   - Click **Save**.
4. Repeat for `Order updated` and `Fulfillment creation` (URL ending in `/api/webhooks/shopify/fulfillments`).
5. Click **Send test notification** to confirm receipt with a 200 OK status.

---

## 🛠️ Troubleshooting & Common Errors

| Issue | Root Cause | Resolution |
|---|---|---|
| **Invalid Shopify token (`shpss_`)** | The API Secret Key was entered. | Enter the Admin API Access Token starting with `shpat_`. |
| **Invalid Store URL** | Custom domain (e.g., `store.com`) was used. | Use the default `store.myshopify.com` domain. |
| **Customer Phone is Empty (`shopify-order-xxx`)** | Protected Customer Data access is omitted. | In Shopify App Settings, check "Order management" & "Customer support" under Customer data access. |
| **Webhook Delivery Failed** | Webhook URL is not publicly reachable via HTTPS. | Ensure your backend is running with a valid HTTPS domain or tunnel. |
