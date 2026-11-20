# E-Commerce WhatsApp Support Bot - Development Notes

This file keeps track of the development progress, completed features, configuration settings, and usage guidelines for each step of the commercial roadmap.

---

## 📋 Roadmap Status

1. **[COMPLETED] Task 1: Shopify & WooCommerce Webhook Integrations**
   - Direct store order sync and auto-confirmation notifications.
2. **[COMPLETED] Task 2: Live Tracking & Delivery Notifications**
   - Proactive shipment and tracking alerts.
3. **[COMPLETED] Task 3: Dynamic Knowledge Base / FAQ Ingestion (RAG)**
   - Custom store FAQ ingestion (PDF, CSV, URL).
4. **[COMPLETED] Task 4: Agent Handover & Chat CRM Portal**
   - Human agent override and live chat CRM.
5. **[COMPLETED] Task 5: Multi-Tenant SaaS Isolation & Billing**
   - Subscriptions and merchant isolation.
6. **[COMPLETED] Task 6: Official WhatsApp Cloud API Integration**
   - Meta official API integration.

## 🌐 Production Domain Settings
* **Selected Domain**: `kwickbot` (e.g. `kwickbot.com` / `kwickbot.ai`)
* **Planned Configuration**:
  - Frontend Application URL: `https://kwickbot.com`
  - Backend API Gateway: `https://api.kwickbot.com`
  - Permanent WhatsApp Webhook Callback URL: `https://api.kwickbot.com/api/webhook/whatsapp`

---

## 🛠️ Completed Steps

### 1. Shopify & WooCommerce Webhook Integrations
Integrated external e-commerce platform webhooks to automatically sync orders, map customers, and trigger proactive WhatsApp order confirmations.

#### 🔀 Webhook Endpoints & Authentication
* **Generic Webhooks:**
  * **Shopify:** `POST /api/webhooks/external-orders/shopify`
  * **WooCommerce:** `POST /api/webhooks/external-orders/woocommerce`
  * **Custom:** `POST /api/webhooks/external-orders/custom`
  * **Auth:** Requires `X-Webhook-Secret` header matching `WEBHOOK_SECRET_TOKEN` in `.env`.
* **Platform-Specific Secure Webhooks:**
  * **Shopify:** `POST /api/webhooks/shopify/orders`
    * **Auth:** Verifies `X-Shopify-Hmac-Sha256` header using `SHOPIFY_WEBHOOK_SECRET`.
  * **WooCommerce:** `POST /api/webhooks/woocommerce/orders`
    * **Auth:** Verifies `X-Wc-Webhook-Signature` header using `WOOCOMMERCE_WEBHOOK_SECRET`.

#### 🧪 Verification & Testing
To simulate incoming order webhooks and test the end-to-end integration (order creation and WhatsApp dispatch):
```bash
# Test Shopify Webhook integration:
node scripts/testWebhook.js shopify +1234567890

# Test WooCommerce Webhook integration:
node scripts/testWebhook.js woocommerce +1234567890
```
*(Note: Replace `+1234567890` with the target customer phone number. Ensure the backend server and MongoDB are running.)*

### 2. Live Tracking & Delivery Notifications
Implemented proactive tracking alerts when order status changes to `shipped` or `delivered` (via automated webhooks or manual admin updates).

#### 🔀 Webhook Endpoints & Automated Updates
* **Shopify Fulfillment Webhooks:** `POST /api/webhooks/shopify/fulfillments`
  * **Auth:** Verifies `X-Shopify-Hmac-Sha256` using `SHOPIFY_WEBHOOK_SECRET`.
  * Automatically maps tracking carrier, tracking number, and tracking URL.
* **WooCommerce Status Updates:** `POST /api/webhooks/woocommerce/orders`
  * **Auth:** Verifies `X-Wc-Webhook-Signature` using `WOOCOMMERCE_WEBHOOK_SECRET`.
  * Extracts AST tracking metadata provider and tracking link formats.
* **Generic Fulfillment Webhooks:** `POST /api/webhooks/external-orders/:source/fulfillment`
  * **Auth:** Requires `X-Webhook-Secret` matching `WEBHOOK_SECRET_TOKEN` in `.env`.
  * Accepts direct tracking payloads (`order_id`, `tracking_number`, `carrier`, `status`).

#### 🎛️ Manual Admin Dashboard Triggers
* When an admin manually changes order status to `shipped` or `delivered` via the CRM dashboard (`/api/orders/:id/status`), a matching WhatsApp alert is dynamically constructed and sent to the customer.

#### 🧪 Verification & Testing
To simulate incoming shipping and tracking updates:
```bash
# Shopify fulfillment webhook test:
node scripts/testFulfillment.js shopify <external_order_id> <tracking_number> <status>

# WooCommerce status/tracking update webhook test:
node scripts/testFulfillment.js woocommerce <external_order_id> <tracking_number> <status>

# Custom/Generic fulfillment update webhook test:
node scripts/testFulfillment.js custom <external_order_id> <tracking_number> <status>
```
*(Note: Replace `<external_order_id>` with the e-commerce store's order ID. Replace `<status>` with `shipped` or `delivered`.)*

### 3. Dynamic Knowledge Base / FAQ Ingestion (RAG)
Implemented a Retrieval-Augmented Generation (RAG) pipeline to support semantic vector search over custom store policy documents (PDF, TXT, CSV) and URLs.

#### 🔀 Endpoints & Ingestion Payload
* **File Uploads (PDF/TXT/CSV):** `POST /api/knowledge-base`
  * **Payload:** FormData with file field `file` and text fields `title`, `description`.
  * **Auth:** Requires JWT Bearer Token.
* **URL Ingestion:** `POST /api/knowledge-base/url`
  * **Payload:** 
    ```json
    {
      "title": "Shipping Policy",
      "url": "https://mystore.com/shipping-policy",
      "description": "Scraped from store footer link"
    }
    ```
  * **Auth:** Requires JWT Bearer Token.
* **Query KB (RAG search):** `POST /api/knowledge-base/query`
  * **Payload:** `{ "question": "what is your return policy?" }`
  * **Auth:** Requires JWT Bearer Token.

#### 🧪 Verification & Testing
To simulate url ingestion and semantic vector query from the backend:
```bash
# Ingest website URL content:
node scripts/testRAG.js url "https://example.com" "Example FAQ"

# Query the vector chunks using RAG pipeline:
node scripts/testRAG.js query "what is the example domain used for?"
```

### 4. Agent Handover & Chat CRM Portal
Implemented human takeover/override controls for the AI assistant and a real-time Live Chat CRM portal. This ensures store agents can seamlessly intervene and take over conversations when escalated or paused.

#### 🔀 Database & AI Bypass Logic
* **Database Schema Extension:** Added `botPaused` (Boolean, default `false`) to the `Conversation` model to track takeover state.
* **Auto-Bypass:** When `botPaused: true` or `status: 'escalated'` or `escalated: true`, the AI bot ceases automated responses and logs customer messages directly to the database.
* **Auto-Pause on Reply:** When an admin sends a manual reply via `sendAdminMessage`, the system automatically pauses the AI bot (`botPaused: true`) to avoid interrupting the agent.

#### 🎛️ Live Chat CRM & Real-Time Sync
* **Live Chat Toggle:** Added a premium AI Bot Status control badge (`AI Active` / `AI Paused`) in the frontend chat header. Click-to-toggle triggers a `PATCH` request to update `botPaused`.
* **Socket.io Synchronization:** Emits real-time messages and updates to all connected dashboard instances.
* **Admin Email Notifications:** When a conversation triggers auto-escalation (complaints or refund keywords), the system retrieves the tenant admin email and sends a detailed HTML alert via `nodemailer`.

#### 🧪 Verification & Testing
To verify auto-escalation, AI bypass logic, admin auto-takeover, and manual resumption:
```bash
node scripts/testEscalation.js
```

### 5. Multi-Tenant SaaS Isolation & Billing
Implemented multi-tenant subscription validation, active usage counting (tokens and messages), pricing plan upgrades, and automatic monthly cycle usage resets.

#### 🔀 Subscription Validation & AI Restriction
* **Account Status Validation:** Validates that the tenant account is active (`isActive: true`) and has an active/trial subscription (`subscriptionStatus: 'active'` or `'trial'`) before responding. If suspended, bypasses AI generation and logs user messages with a service offline alert.
* **Token Limit Enforcement:** Compares `geminiTokensUsed` against `geminiTokensLimit`. If exceeded, bypasses AI response generation and triggers a high volume warning to the customer.
* **Metric Increments:** Logs total messages handled (`totalMessagesProcessed += 1`) and actual token consumption (`geminiTokensUsed += totalTokens`) for every query in MongoDB.

#### ⏰ Monthly Reset Job & Subscription Upgrades
* **Monthly Reset Scheduler:** Configured a daily cron job via `node-cron` inside `server.js` that checks for accounts whose `lastTokenReset` was over 30 days ago, clears `geminiTokensUsed` back to `0`, and updates the cycle timestamp.
* **Upgrade Endpoints:** Mapped `GET /api/auth/plans` to list pricing plans and `POST /api/auth/upgrade-plan` to update subscription plans, monthly prices, and token limits.
* **Billing Frontend Portal:** Created a premium Billing & Plans dashboard (`/dashboard/billing`) displaying active plan cards, token usage progress bars, upgrade options, and invoice history.

#### 🧪 Verification & Testing
To verify subscription validation checks, token limit enforcement, token tracking, and the monthly reset job:
```bash
node scripts/testBillingAndIsolation.js
```
*(Note: Ensure MongoDB is active. This runs verification assertions checking all conditions.)*

### 6. Official WhatsApp Cloud API Integration
Fully integrated the Meta WhatsApp Cloud API into the bot workflow, implementing secure handshake verification, customer name extraction, delivery status update mappings, and consolidated database logging to avoid duplicate rows.

#### 🔀 Webhook Endpoints & Handshake
* **Verification (GET) & message ingestion (POST):** `POST/GET /api/webhook/whatsapp`
  * **GET Handshake:** Verifies verification requests from Meta using `WEBHOOK_VERIFY_TOKEN`.
  * **POST Callback:** Safely extracts customer names from the `contacts?.[0]?.profile?.name` payload. Dispatches reply using Meta Graph API if active; otherwise skips response.
  * **Delivery Status Update:** Receives status callback events (`sent`, `delivered`, `read`, `failed`) and updates the `status` attribute on messages in the `Conversation` database schema using the matching Meta `messageId`.
* **Manual Reply Dispatch:** Mounts `whatsappCloudAPI.sendMessage` to trigger physical messages on Meta App servers.

#### 🛠️ Extended Schema & Logging Consolidation
* **Database Schema Extension:** Extended the `messages` array in the `Conversation` model to store `messageId` (String) and `status` (String, default `'sent'`).
* **Deduplication:** Consolidated all database log assertions within `aiService.processMessage`, and deleted double logging helpers in `webhookController.js` and `whatsappWebBot.js`.

#### 🎛️ Premium Dual-Tab Connection Manager
* **WhatsApp Connect Portal:** Upgraded `/dashboard/whatsapp-connect` with two premium tabs:
  1. **WhatsApp Web Bot (QR Code):** Displays live QR socket stream pairing.
  2. **WhatsApp Cloud API (Meta Production):** Automatically queries `/api/webhook/status` to show configurations, display name, business phone details, verified status, and Meta Developer App onboarding instructions.

#### 🧪 Verification & Testing
To simulate webhook GET handshake verification, POST incoming messages, Gemini responses, status callbacks, subscription validation blocks, and agent takeover bypass checks:
```bash
node scripts/testCloudAPIWebhook.js
```
*(Note: Run inside backend directory. Ensures all assertions pass successfully.)*

### 7. Dynamic Multi-Currency Support
Implemented dynamic base currency support across the CRM orders list, simulated demo chat window, shipping policy text, and official AI WhatsApp auto-replies.

#### 🔀 Settings & Dynamic Formatting
* **Dynamic Resolution:** Base currency is retrieved directly from the merchant's `admin.currency` profile setting (defaults to `USD`).
* **Intl.NumberFormat Integration:** Formats amount values to correct localized currency patterns:
  - Uses `en-IN` formatting (e.g. `₹1,200.00`) when currency is `INR`.
  - Uses `en-US` formatting (e.g. `$1,200.00`, `€1,200.00`, etc.) for other international currencies.
  - Fallback map supports standard symbols: `USD/CAD/AUD ($)`, `EUR (€)`, `GBP (£)`, `INR (₹)`, `JPY (¥)`, `AED (د.إ)`.
* **Frontend Adaptations:** 
  - Dynamic table columns and interactive amount inputs in the CRM portal (`Orders.js`).
  - Dynamic lookup matching in Simulated Live Chat (`DemoChat.js`).
  - Context-aware shipping policies: automatically suggests INR free shipping rates when base currency is set to `INR`.
* **Backend AI Adaptations:**
  - Asynchronous lookup inside `aiService.js` that retrieves the merchant's preference from MongoDB when processing status replies.

---

## 🔮 Future Features & Commercial Roadmap

The following suggestions have been approved to build in future product sprints:
1. **🛒 Abandoned Cart Recovery (WhatsApp)**: Send automatic friendly reminders on WhatsApp with direct checkout links when customers leave items in their cart.
2. **🔘 Interactive WhatsApp Buttons**: Use official Meta interactive buttons (e.g. "Check Order Status", "Talk to Agent") inside messages rather than asking users to type text.
3. **✍️ AI-Generated Agent Drafts**: Instead of the bot replying directly, it drafts a message for the agent in the Live Chat CRM, who can edit and click "Send".
4. **🌐 Real-Time Translation**: Auto-translate incoming foreign languages to English/Gujarati for dashboard agents, and auto-translate agent replies back to the customer's language.
5. **📅 Scheduled Marketing Broadcasts**: Target specific cohorts of customers and schedule broadcast messages for upcoming sales or new product collections.
6. **🎙️ Voice Note Processing**: Transcribe customer voice messages using Whisper/Gemini and let the bot answer them, with option to output AI voice responses.
7. **📊 Advanced Bot Analytics & ROI Tracking**: Track ticket containment rate (how many queries were solved without human handover) and estimated savings in support costs.
