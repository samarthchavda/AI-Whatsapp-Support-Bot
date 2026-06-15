# 🛍️ Shopify Admin Webhook Configuration List

To enable all automated WhatsApp notifications, order tracking, and cart recovery features, you must add the following webhooks in your Shopify Admin dashboard.

---

## ⚙️ How to Add Webhooks in Shopify Admin
1. Login to your **Shopify Admin Dashboard**.
2. Go to **Settings** (gear icon in the bottom-left corner).
3. Click on **Notifications** (or **Notifications > Webhooks** depending on your Shopify version).
4. Scroll down to the **Webhooks** section at the bottom.
5. Click the **Create webhook** button for each event listed below.

*Note: For **all** webhooks below, use the same **Webhook URL** and **Verification Token** found in your bot's **Tools > Integrations > Shopify** setup modal.*

---

## 📋 Complete Webhook Events List

Create a webhook for each of the following events:

### 1. 🛒 Abandoned Carts Webhooks (New Feature)
These events notify the bot when a customer starts checking out but leaves without purchasing, enabling automatic WhatsApp reminders.
* **Event**: `Checkout creation`
* **Format**: `JSON`
* **URL**: *Your Bot's Shopify Webhook URL*
* **API Version**: `Latest (Recommended)`

* **Event**: `Checkout update`
* **Format**: `JSON`
* **URL**: *Your Bot's Shopify Webhook URL*
* **API Version**: `Latest (Recommended)`

---

### 2. 🎉 Order Confirmation Webhooks
This event notifies the bot when a customer successfully completes a purchase, triggering the instant "Order Confirmed" WhatsApp message and registering the sale.
* **Event**: `Order creation`
* **Format**: `JSON`
* **URL**: *Your Bot's Shopify Webhook URL*
* **API Version**: `Latest (Recommended)`

---

### 3. 🚚 Shipping & Fulfillment Updates Webhooks
This event notifies the bot when a package is packed, shipped, or updated with a tracking number, triggering the "Order Shipped" WhatsApp alert with carrier links.
* **Event**: `Fulfillment creation` (or `Fulfillment update`)
* **Format**: `JSON`
* **URL**: *Your Bot's Shopify Webhook URL*
* **API Version**: `Latest (Recommended)`

---

### 4. ❌ Order Cancellations & Edits Webhooks
This event notifies the bot when an order is cancelled or edited by the store admin, sending a cancellation notice to the customer and stopping any pending recovery cron tasks.
* **Event**: `Order update`
* **Format**: `JSON`
* **URL**: *Your Bot's Shopify Webhook URL*
* **API Version**: `Latest (Recommended)`
