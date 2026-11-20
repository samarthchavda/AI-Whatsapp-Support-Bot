export const SHOPIFY_GUIDE_STEPS = [
  {
    step: 1,
    title: "Open Shopify Settings",
    description: "Log in to your Shopify Store Admin. In the bottom-left corner of the dashboard sidebar, click on the Settings gear icon.",
    image: "/guide/shopify/step-1.png"
  },
  {
    step: 2,
    title: "Apps and Sales Channels",
    description: "In the Settings side menu, locate and click on Apps and sales channels to manage integrations.",
    image: "/guide/shopify/step-2.png"
  },
  {
    step: 3,
    title: "Access Custom App Development",
    description: "Click on the Develop apps button in the top right header to begin custom app configuration.",
    image: "/guide/shopify/step-3.png"
  },
  {
    step: 4,
    title: "Create App Instance",
    description: "Click Create an app. In the modal, specify an App name (e.g. 'Kwickbot') and select the Developer email. Click Create app.",
    image: "/guide/shopify/step-4.png"
  },
  {
    step: 5,
    title: "Configure Admin API Scopes",
    description: "In the App Configuration screen, locate Admin API integration and click on the Configure Admin API integration button.",
    image: "/guide/shopify/step-5.png"
  },
  {
    step: 6,
    title: "Select Access Permissions",
    description: "Check the boxes for read_orders, read_products, read_customers, and read_fulfillments. Scroll down and click Save.",
    image: "/guide/shopify/step-6.png"
  },
  {
    step: 7,
    title: "Install Custom App",
    description: "Go back to the top of the app overview tab. In the top-right corner of the page, click on the Install app button.",
    image: "/guide/shopify/step-7.png"
  },
  {
    step: 8,
    title: "Confirm App Installation",
    description: "Review the API access warnings and confirm installation by clicking Install in the modal popup dialog.",
    image: "/guide/shopify/step-8.png"
  },
  {
    step: 9,
    title: "Retrieve API Credentials",
    description: "Select the API credentials tab. Under the Admin API access token card, you will find the hidden token fields.",
    image: "/guide/shopify/step-9.png"
  },
  {
    step: 10,
    title: "Reveal Access Token once",
    description: "Click on the Reveal token once link to display your secure credentials. This will only be shown once.",
    image: "/guide/shopify/step-10.png"
  },
  {
    step: 11,
    title: "Copy Admin Access Token",
    description: "Copy the revealed access token (which begins with 'shpat_') and save it securely. Note: It cannot be displayed again.",
    image: "/guide/shopify/step-11.png"
  },
  {
    step: 12,
    title: "Note API Keys",
    description: "Under the API credentials card, you can also view and copy the API key and API secret key if required.",
    image: "/guide/shopify/step-12.png"
  },
  {
    step: 13,
    title: "Connect on Kwickbot Dashboard",
    description: "Open your Kwickbot Dashboard. Navigate to Integrations -> Shopify -> click Connect Shopify.",
    image: "/guide/shopify/step-13.png"
  },
  {
    step: 14,
    title: "Input Store URL & Token",
    description: "Enter your Shopify Store URL (e.g. https://your-store.myshopify.com) and paste the Admin API Token. Click Connect.",
    image: "/guide/shopify/step-14.png"
  },
  {
    step: 15,
    title: "Retrieve unique Webhook URL",
    description: "After saving the store, review the first order sync result in Kwickbot. The webhook URL must be verified by Kwickbot before it can be added to Shopify.",
    image: "/guide/shopify/step-15.png"
  },
  {
    step: 16,
    title: "Configure Webhooks in Shopify Settings",
    description: "When Kwickbot shows a verified webhook URL, configure the supported order event in Shopify and send a test event. Until then, use Sync Orders for imports.",
    image: "/guide/shopify/step-16.png"
  }
];

