# 🛒 E-Commerce: Abandoned Cart Recovery Testing Guide (From Scratch)

This guide provides step-by-step instructions on how to test the **Abandoned Cart Recovery (WhatsApp)** feature from the e-commerce store and the admin frontend dashboard. 

---

## 🛠️ Step 1: Prerequisites Check

Before testing, make sure the following settings are connected in your bot dashboard:

1. **WhatsApp Connected**: 
   - Go to **Tools > WhatsApp Connect** on the sidebar.
   - Ensure you have connected either the **Official WhatsApp Cloud API** (configured with Phone ID and Access Token) or the **WhatsApp Web Bot** (QR Code scan).
   - *If WhatsApp is offline, the recovery messages cannot be sent.*

2. **Shopify Store Connected**:
   - Go to **Tools > Integrations** on the sidebar.
   - Under **Shopify**, click **Connect** (or check if it is active). 
   - Ensure you register the Webhook URL and Verification Token shown there in your Shopify Admin under **Settings > Notifications > Webhooks**.
   - **Crucial**: Make sure you set the webhook event topic to **Order update** or **Checkout update / Checkout creation** and target your webhook URL.

3. **Optional: Template Mapping**:
   - Go to **Tools > Templates**.
   - If you have an approved Meta template for abandoned carts, select it under the dropdown and map it to **E-Commerce: Abandoned Cart**.
   - *If no template is mapped, the system will automatically fall back to sending a high-converting plain-text message via the WhatsApp Web Bot.*

---

## 🏃‍♂️ Step 2: Simulate a Customer Abandoning their Cart

1. Open a new private/incognito browser window and go to your **Shopify test store**.
2. Add one or more products to your cart.
3. Proceed to the **Checkout page**.
4. In the checkout form, fill out the customer details:
   - **Name**: Use a recognizable test name (e.g., *Samarth Test*).
   - **Email**: Enter a test email.
   - **Phone**: **IMPORTANT** – Enter a valid mobile phone number that can receive WhatsApp messages (e.g., your own phone number, including country code).
5. Advance to the **Shipping page** (so Shopify saves the contact details and coordinates the checkout URL).
6. **Stop here!** Close the browser tab without making a payment or completing the order. 

Shopify will now register this checkout as abandoned and fire a webhook to your AI Support Bot.

---

## 📊 Step 3: Check the Abandoned Carts Dashboard

1. Navigate to your AI Support Bot dashboard (`http://localhost:3000/dashboard/abandoned-carts`).
2. You should see a new entry matching your checkout details under the list of carts:
   - The customer name, phone number, and items list will be visible.
   - The status badge will show **Abandoned** (Orange/Yellow).
   - The KPI metrics at the top will update to show **Total Carts Tracked** = `1` and **Lost/Abandoned Revenue** reflecting your cart's total value.

---

## 📱 Step 4: Dispatch the WhatsApp Recovery Reminder

You can test the recovery message dispatch in two ways:

### Option A: Manual Trigger (Instant)
1. On the dashboard table next to your test cart, click the **Send Reminder** button.
2. The button will change to "Sending..." and then show a success confirmation.
3. Check the WhatsApp number you entered during checkout. You will receive the recovery notification:
   - **Message content**: A personalized alert saying *"Hi [Customer Name]! We noticed you left some items in your cart. You can complete your purchase using this link: [Shopify checkout recovery URL]..."*
4. On your dashboard, the cart's status badge will update to **Reminded** (Blue/Indigo), and the **Reminders Dispatched** KPI count will increment.

### Option B: Automatic Scheduler (Background Cron)
- The server checks for abandoned checkouts every minute.
- Carts that are older than **30 minutes** (but newer than 24 hours) will automatically trigger the reminder.

---

## 🎯 Step 5: Complete the Purchase (Conversion Verification)

1. On the WhatsApp message you received (or by clicking the **View Checkout** button next to the cart on your dashboard), click the checkout recovery link.
2. The link will open your Shopify checkout containing the items you previously left.
3. Complete the checkout by submitting a payment (use a Test Payment gateway or Shopify's *"Bogus Gateway"*).
4. Once the order is completed, Shopify will fire an **Order update / Order creation** webhook to the bot.
5. The backend will parse the incoming order, match it to your abandoned cart token or phone number, and perform the following actions:
   - The status of the cart on the dashboard will transition to **Recovered** (Green).
   - The top metrics will update instantly:
     - **Recovery Rate** will rise to `100%`.
     - **Recovered Revenue** will increase by the cart amount.
     - **Lost/Abandoned Revenue** will decrease back to `$0.00`.
