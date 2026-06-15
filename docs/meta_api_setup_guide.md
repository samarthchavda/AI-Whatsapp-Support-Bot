# Meta WhatsApp Business API - Step-by-Step Setup Guide

This guide explains how to set up the official Meta WhatsApp Business API for your store and how it operates seamlessly for both the **Store Admin (you/your merchants)** and the **End Buyers (your customers)**.

---

## Part 1: How it Works for the End Buyer (Customers)
**The End Buyer needs to do absolutely nothing.** They do not need to download any special apps, register accounts, or configure any settings. 
* When they place an order on the Shopify store, our backend automatically triggers the Meta API.
* The buyer simply receives a clean, professional notification on their regular WhatsApp app from the store's verified business number.
* If they reply to the message, the AI Bot answers their questions automatically.

---

## Part 2: Step-by-Step Setup for the Store Admin (10 Minutes)

To send official messages, each Store Admin needs a **Meta Developer Account** (which is free and includes 1,000 free customer-service conversations per month). Follow these steps to get the credentials.

### Step 1: Create a Meta Developer Account
1. Go to the [Meta for Developers Portal](https://developers.facebook.com/).
2. Log in with your regular Facebook account.
3. Click **My Apps** in the top right corner and click **Create App**.
4. Select **Other** -> click **Next**.
5. Select **Business** as the app type -> click **Next**.
6. Give your app a name (e.g., `My Store WhatsApp Bot`) and select your **Facebook Business Account** if you have one (optional, you can create one during the process). Click **Create App**.

---

### Step 2: Add the WhatsApp Product to your App
1. You will be redirected to the App Dashboard. Scroll down and locate **WhatsApp**.
2. Click **Set Up**.
3. Select or create a Meta Business Account -> click **Continue**.

---

### Step 3: Add a Business Phone Number
Meta will give you a temporary test phone number to start with. To use your own store number:
1. In the left menu, go to **WhatsApp** -> **API Setup**.
2. Scroll down to **Step 5: Add a phone number** and click **Add Phone Number**.
3. Fill in your Business Profile details (Business Name, Website, Country).
4. Enter the phone number you want to use for WhatsApp Business.
   * *Note: The number must not be registered on a personal WhatsApp app. If it is, delete the account from your WhatsApp phone app first.*
5. Select your verification method (Text Message or Phone Call) to receive the OTP and verify the number.

---

### Step 4: Get your Credentials (Access Token & Phone ID)
On the **API Setup** page, copy the following values:
1. **Phone Number ID**: A 15-digit number (e.g., `109283746592817`).
2. **WhatsApp Business Account ID**: A 15-digit account identifier.

> [!WARNING]
> The access token shown on the **API Setup** page is a **Temporary Access Token** which expires in 24 hours. You must generate a **Permanent Access Token** for your live store. See Step 5 below.

---

### Step 5: Generate a Permanent Access Token (Important)
To prevent your API connection from breaking after 24 hours, generate a permanent token:
1. Go to your [Facebook Business Manager Settings](https://business.facebook.com/settings).
2. In the left sidebar, click **Users** -> **System Users**.
3. Click **Add** to create a new System User. Name it `WhatsAppBot` and set the role to **Admin**.
4. Select the new System User and click **Add Assets**.
5. Select **Apps** -> Choose your WhatsApp App -> Enable **Full Control** (Manage App) -> click **Save Changes**.
6. Click **Generate New Token**.
7. Select your App from the dropdown.
8. Scroll down to the checklist of permissions and check:
   * `whatsapp_business_messaging`
   * `whatsapp_business_management`
9. Click **Generate Token**.
10. **Copy this Token immediately** and save it in a safe place. This token will never expire.

---

## Part 3: Connecting to the AI Support Bot Dashboard

Once you have your credentials, input them into our application dashboard:

1. Open your **AI Support Bot Admin Dashboard**.
2. Navigate to **Settings** or **Integrations** -> **WhatsApp API Settings**.
3. Input the following values:
   * **Permanent Access Token** (from Step 5)
   * **Phone Number ID** (from Step 4)
   * **WhatsApp Business Account ID** (from Step 4)
4. Click **Save Settings**.
5. You are now fully connected! Your Shopify webhooks and automated AI chatbot will route through your official Meta Business number without any risk of getting banned.
