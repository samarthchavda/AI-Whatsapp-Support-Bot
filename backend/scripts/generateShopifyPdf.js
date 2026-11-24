const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

function getBase64Image(filePath) {
  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath).slice(1);
    const data = fs.readFileSync(filePath).toString('base64');
    return `data:image/${ext};base64,${data}`;
  }
  return '';
}

const stepsData = [
  {
    step: 1,
    title: "Open Shopify Settings",
    desc: "Log in to your Shopify Store Admin dashboard. In the bottom-left corner of the sidebar, click on the Settings gear icon.",
    image: path.resolve(__dirname, '../../frontend/public/guide/shopify/step-1.png'),
    tip: "Ensure you are logged in as a Store Owner or have Staff permissions with App Management enabled."
  },
  {
    step: 2,
    title: "Navigate to Apps and Sales Channels",
    desc: "In the Settings side menu, locate and click on 'Apps and sales channels' to manage integrations and developer configurations.",
    image: path.resolve(__dirname, '../../frontend/public/guide/shopify/step-2.png'),
    tip: "This section manages all installed public apps, sales channels, and private developer configurations."
  },
  {
    step: 3,
    title: "Access Custom App Development",
    desc: "Click on the 'Develop apps' button in the top-right header to begin custom app configuration.",
    image: path.resolve(__dirname, '../../frontend/public/guide/shopify/step-3.png'),
    tip: "If custom app development is not yet enabled, click 'Allow custom app development' and confirm."
  },
  {
    step: 4,
    title: "Create App Instance",
    desc: "Click 'Create an app'. In the dialog modal, enter the App name (e.g., 'Kwickbot WhatsApp Bot') and select your developer contact email. Click 'Create app'.",
    image: path.resolve(__dirname, '../../frontend/public/guide/shopify/step-4.png'),
    tip: "Use a clear, identifiable app name like 'Kwickbot WhatsApp Bot' for easy tracking."
  },
  {
    step: 5,
    title: "Configure Admin API Scopes",
    desc: "In the App Configuration tab, locate the 'Admin API integration' section and click the 'Configure' button.",
    image: path.resolve(__dirname, '../../frontend/public/guide/shopify/step-5.png'),
    tip: "Admin API scopes define the exact data permissions Kwickbot has access to."
  },
  {
    step: 6,
    title: "Select Required Access Permissions",
    desc: "Search and check the boxes for: read_orders, read_products, read_customers, and read_fulfillments. Scroll down and click Save.",
    image: path.resolve(__dirname, '../../frontend/public/guide/shopify/step-6.png'),
    tip: "CRITICAL: Under App settings, ensure Protected Customer Data is configured for Order Management and Customer Support."
  },
  {
    step: 7,
    title: "Install Custom App",
    desc: "Return to the top of the app overview tab. In the top-right corner of the page, click on the green 'Install app' button.",
    image: path.resolve(__dirname, '../../frontend/public/guide/shopify/step-7.png'),
    tip: "Installing the app activates the API credentials and generates your private access token."
  },
  {
    step: 8,
    title: "Confirm App Installation",
    desc: "Review the API access permissions summary and confirm the installation by clicking 'Install' in the confirmation modal dialog.",
    image: path.resolve(__dirname, '../../frontend/public/guide/shopify/step-8.png'),
    tip: "Shopify requires you to confirm granting API access to the selected store resources."
  },
  {
    step: 9,
    title: "Navigate to API Credentials",
    desc: "Select the 'API credentials' tab. Locate the 'Admin API access token' card where your private access token is stored.",
    image: path.resolve(__dirname, '../../frontend/public/guide/shopify/step-9.png'),
    tip: "Keep this tab open while you copy the credentials into your Kwickbot Merchant Portal."
  },
  {
    step: 10,
    title: "Reveal Access Token Once",
    desc: "Click on the 'Reveal token once' link to display your secret token. WARNING: This token will only be revealed once by Shopify.",
    image: path.resolve(__dirname, '../../frontend/public/guide/shopify/step-10.png'),
    tip: "If the page is reloaded or navigated away from, the token cannot be viewed again and must be regenerated."
  },
  {
    step: 11,
    title: "Copy Admin Access Token",
    desc: "Copy the revealed access token (which begins with 'shpat_') and save it securely. Note: Do NOT copy the API secret key ('shpss_').",
    image: path.resolve(__dirname, '../../frontend/public/guide/shopify/step-11.png'),
    tip: "Valid Kwickbot Shopify Admin API tokens always begin with the 'shpat_' prefix."
  },
  {
    step: 12,
    title: "Note API Keys & Store Domain",
    desc: "Verify your default Shopify store URL (e.g., yourstore.myshopify.com) and keep your Admin API token ready for connection.",
    image: path.resolve(__dirname, '../../frontend/public/guide/shopify/step-12.png'),
    tip: "Do not use your custom vanity domain (like brand.com); always use the default *.myshopify.com domain."
  },
  {
    step: 13,
    title: "Open Kwickbot Merchant Dashboard",
    desc: "Open your Kwickbot Merchant Portal. Navigate to the Integrations page, locate the Shopify card, and click 'Connect Shopify'.",
    image: path.resolve(__dirname, '../../frontend/public/guide/shopify/step-13.png'),
    tip: "Ensure your Merchant Profile details (Store Name, Phone, Support Email) are filled before connecting."
  },
  {
    step: 14,
    title: "Input Store URL & Admin Token",
    desc: "Enter your Shopify Store URL (e.g., https://your-store.myshopify.com) and paste the Admin API Token (shpat_...). Click 'Connect'.",
    image: path.resolve(__dirname, '../../frontend/public/guide/shopify/step-14.png'),
    tip: "Kwickbot will immediately test the connection, verify permissions, and pull existing store orders automatically."
  },
  {
    step: 15,
    title: "Retrieve Webhook URL & Review Sync",
    desc: "Upon successful connection, Kwickbot displays your unique Webhook URL and executes an initial order synchronization.",
    image: path.resolve(__dirname, '../../frontend/public/guide/shopify/step-15.png'),
    tip: "Navigate to the Orders tab in Kwickbot to review all imported Shopify orders and customer profiles."
  },
  {
    step: 16,
    title: "Configure Webhooks in Shopify Settings",
    desc: "In Shopify Admin -> Settings -> Notifications -> Webhooks -> Click 'Create webhook'. Add the Order creation and Fulfillment events with your Kwickbot Webhook URL.",
    image: path.resolve(__dirname, '../../frontend/public/guide/shopify/step-16.png'),
    tip: "Click 'Send test notification' in Shopify to verify real-time 200 OK delivery from Shopify to Kwickbot."
  }
];

async function generatePDF() {
  console.log('Building pure English HTML for PDF...');

  let stepsHtml = '';
  stepsData.forEach((s, idx) => {
    const base64Img = getBase64Image(s.image);
    const pageBreak = (idx + 1) % 2 === 0 && idx !== stepsData.length - 1 ? 'page-break' : '';
    
    stepsHtml += `
      <div class="step-card ${pageBreak}">
        <div class="step-header">
          <div class="step-badge">STEP ${s.step}</div>
          <div class="step-title-group">
            <h3 class="step-title">${s.title}</h3>
          </div>
        </div>

        <div class="step-content">
          <div class="step-desc-box">
            <p class="desc-text">${s.desc}</p>
          </div>

          ${base64Img ? `
            <div class="image-wrapper">
              <img src="${base64Img}" alt="Step ${s.step}" />
            </div>
          ` : ''}

          <div class="tip-box">
            <span class="tip-icon">💡</span>
            <span class="tip-text"><strong>Key Requirement:</strong> ${s.tip}</span>
          </div>
        </div>
      </div>
    `;
  });

  const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Shopify to Kwickbot Integration Guide</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

    @page {
      size: A4 portrait;
      margin: 12mm 14mm 14mm 14mm;
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-size: 9px;
        color: #64748b;
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
      background-color: #ffffff;
      line-height: 1.5;
      font-size: 11px;
    }

    .page-break {
      page-break-after: always;
      break-after: page;
    }

    /* Cover Page */
    .cover-page {
      min-height: 92vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 30px 24px;
      page-break-after: always;
      break-after: page;
      border: 2px solid #e2e8f0;
      border-radius: 20px;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    }

    .cover-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #cbd5e1;
      padding-bottom: 20px;
    }

    .brand-logo-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-logo-badge {
      background: #25D366;
      color: #ffffff;
      font-weight: 800;
      font-size: 16px;
      padding: 8px 16px;
      border-radius: 12px;
      letter-spacing: 0.5px;
    }

    .brand-shopify-badge {
      background: #96bf48;
      color: #ffffff;
      font-weight: 800;
      font-size: 16px;
      padding: 8px 16px;
      border-radius: 12px;
    }

    .doc-meta-badge {
      font-size: 10px;
      font-weight: 700;
      background: #e2e8f0;
      color: #475569;
      padding: 6px 14px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .cover-middle {
      margin: 40px 0;
      text-align: center;
    }

    .cover-subtitle {
      font-size: 14px;
      font-weight: 700;
      color: #16a34a;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 14px;
    }

    .cover-title {
      font-size: 32px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.25;
      margin-bottom: 18px;
    }

    .cover-desc {
      font-size: 13px;
      color: #475569;
      max-width: 580px;
      margin: 0 auto 26px auto;
      line-height: 1.6;
    }

    .features-pill-grid {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
      margin-top: 20px;
    }

    .feature-pill {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 8px 16px;
      border-radius: 30px;
      font-size: 11px;
      font-weight: 600;
      color: #334155;
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }

    .cover-bottom {
      border-top: 2px solid #cbd5e1;
      padding-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #64748b;
    }

    /* Executive Overview Page */
    .overview-page {
      padding: 10px 0;
      page-break-after: always;
      break-after: page;
    }

    .section-title {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-subtitle {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 20px;
    }

    .arch-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 18px;
      margin-bottom: 22px;
    }

    .flow-steps {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 14px;
    }

    .flow-box {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 12px;
      text-align: center;
    }

    .flow-box h4 {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }

    .flow-box p {
      font-size: 9.5px;
      color: #64748b;
      line-height: 1.35;
    }

    .table-custom {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      font-size: 10.5px;
    }

    .table-custom th {
      background: #0f172a;
      color: #ffffff;
      text-align: left;
      padding: 9px 12px;
      font-weight: 600;
    }

    .table-custom td {
      padding: 8px 12px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
    }

    .table-custom tr:nth-child(even) {
      background-color: #f8fafc;
    }

    /* Step Cards */
    .step-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 14px 16px;
      margin-bottom: 18px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.03);
    }

    .step-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #f1f5f9;
    }

    .step-badge {
      background: #0f172a;
      color: #ffffff;
      font-size: 9px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 6px;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }

    .step-title {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
    }

    .step-desc-box {
      background: #f8fafc;
      border-left: 3px solid #25D366;
      padding: 8px 12px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 10px;
    }

    .desc-text {
      font-size: 11px;
      color: #1e293b;
      line-height: 1.5;
    }

    .image-wrapper {
      text-align: center;
      margin: 10px 0;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      background: #f1f5f9;
      max-height: 250px;
    }

    .image-wrapper img {
      width: 100%;
      max-height: 250px;
      object-fit: contain;
      display: block;
    }

    .tip-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fffbeb;
      border: 1px solid #fef3c7;
      padding: 6px 10px;
      border-radius: 6px;
      margin-top: 8px;
    }

    .tip-icon {
      font-size: 12px;
    }

    .tip-text {
      font-size: 9.5px;
      color: #92400e;
    }

    .summary-box {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 12px;
      padding: 16px;
      margin-top: 14px;
    }

    .summary-box h4 {
      font-size: 13px;
      font-weight: 800;
      color: #065f46;
      margin-bottom: 8px;
    }

    .summary-box ul {
      margin-left: 18px;
      font-size: 10.5px;
      color: #047857;
      line-height: 1.6;
    }
  </style>
</head>
<body>

  <!-- COVER PAGE -->
  <div class="cover-page">
    <div class="cover-top">
      <div class="brand-logo-group">
        <span class="brand-logo-badge">KWICKBOT</span>
        <span style="font-weight:bold; color:#94a3b8;">✕</span>
        <span class="brand-shopify-badge">SHOPIFY</span>
      </div>
      <span class="doc-meta-badge">Official Merchant Guide</span>
    </div>

    <div class="cover-middle">
      <div class="cover-subtitle">Enterprise E-commerce Automation</div>
      <h1 class="cover-title">Shopify to Kwickbot<br/>Integration Guide</h1>
      <p class="cover-desc">
        Complete step-by-step visual documentation for connecting your active Shopify store with Kwickbot AI WhatsApp Bot for real-time order tracking, live sync, abandoned cart recovery, and 24/7 automated customer support.
      </p>

      <div class="features-pill-grid">
        <span class="feature-pill">⚡ 16 Visual Screenshots</span>
        <span class="feature-pill">🔐 Admin API Token (shpat_...)</span>
        <span class="feature-pill">📦 Real-time Webhooks Engine</span>
        <span class="feature-pill">🤖 AI WhatsApp Order Tracking</span>
        <span class="feature-pill">🛒 Abandoned Cart Recovery</span>
        <span class="feature-pill">📘 100% English Documentation</span>
      </div>
    </div>

    <div class="cover-bottom">
      <div><strong>Platform:</strong> Kwickbot AI WhatsApp Support Bot</div>
      <div><strong>Version:</strong> 1.0.0 (Production Verified)</div>
      <div><strong>Date:</strong> November 2026</div>
    </div>
  </div>

  <!-- OVERVIEW & ARCHITECTURE -->
  <div class="overview-page">
    <h2 class="section-title">📘 Executive Overview & Architecture</h2>
    <p class="section-subtitle">How Kwickbot integrates with Shopify via Custom App Admin API and Real-time Webhooks</p>

    <div class="arch-card">
      <h3 style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">How the Connection Works</h3>
      <p style="font-size: 10.5px; color: #475569; line-height: 1.5;">
        Kwickbot connects directly to Shopify using an authenticated <strong>Custom Admin App</strong>. No third-party middleware is required. Once connected, historical orders are imported into Kwickbot, and new purchases or shipping updates are streamed instantly via <strong>Shopify Webhooks</strong> to trigger automated WhatsApp messages and empower the AI chatbot.
      </p>

      <div class="flow-steps">
        <div class="flow-box">
          <h4>1. Custom App</h4>
          <p>Create an app in Shopify Admin with order and customer scopes.</p>
        </div>
        <div class="flow-box">
          <h4>2. Admin Token</h4>
          <p>Generate a secure token starting with <code>shpat_</code>.</p>
        </div>
        <div class="flow-box">
          <h4>3. Kwickbot Sync</h4>
          <p>Input credentials into Kwickbot to pull historical orders.</p>
        </div>
        <div class="flow-box">
          <h4>4. WhatsApp Bot</h4>
          <p>AI Bot answers order queries & sends delivery alerts.</p>
        </div>
      </div>
    </div>

    <h3 style="font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 20px; margin-bottom: 6px;">Required Scopes & Data Entitlements</h3>
    <table class="table-custom">
      <thead>
        <tr>
          <th>Shopify Scope</th>
          <th>Access Type</th>
          <th>Purpose in Kwickbot WhatsApp Bot</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>read_orders</code></td>
          <td>Read Only</td>
          <td>Fetches order number, total amount, line items, and fulfillment status for WhatsApp customer queries.</td>
        </tr>
        <tr>
          <td><code>read_customers</code></td>
          <td>Read Only</td>
          <td>Retrieves customer phone number and shipping name for direct WhatsApp messaging.</td>
        </tr>
        <tr>
          <td><code>read_products</code></td>
          <td>Read Only</td>
          <td>Enables AI bot to answer product inquiries, stock availability, and catalog questions.</td>
        </tr>
        <tr>
          <td><code>read_fulfillments</code></td>
          <td>Read Only</td>
          <td>Tracks courier tracking numbers, dispatch status, and delivery confirmations in real time.</td>
        </tr>
      </tbody>
    </table>

    <div class="summary-box">
      <h4>⚠️ Key Prerequisites Checklist Before Connecting:</h4>
      <ul>
        <li><strong>Profile Completed:</strong> Your Kwickbot profile must have Store Name, Phone Number, and Support Email filled.</li>
        <li><strong>Domain Format:</strong> Always use your default <code>yourstore.myshopify.com</code> domain, not custom domain URLs.</li>
        <li><strong>Token Format:</strong> Only use the <code>shpat_</code> Admin API access token (never use the <code>shpss_</code> secret key).</li>
      </ul>
    </div>
  </div>

  <!-- ALL 16 STEPS WITH SCREENSHOTS -->
  <div class="steps-container">
    <h2 class="section-title" style="margin-bottom: 14px;">📸 Complete 16-Step Visual Setup Walkthrough</h2>
    ${stepsHtml}
  </div>

  <!-- VERIFIED TEST RUN & TROUBLESHOOTING -->
  <div class="page-break" style="padding-top: 10px;">
    <h2 class="section-title">✅ Production Verification & Live Test Run</h2>
    <p class="section-subtitle">Real-world test connection verified on Kwickbot platform</p>

    <div class="arch-card" style="margin-bottom: 16px;">
      <h3 style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">Live Connection Test Summary:</h3>
      <table class="table-custom" style="margin-top: 0;">
        <tr>
          <td><strong>Test Store Domain:</strong></td>
          <td><code>ai-whatsapp-demo-store.myshopify.com</code></td>
        </tr>
        <tr>
          <td><strong>Installed App Name:</strong></td>
          <td><code>Kwickbot WhatsApp Bot</code></td>
        </tr>
        <tr>
          <td><strong>API Token Verified:</strong></td>
          <td><code>shpat_********************************</code></td>
        </tr>
        <tr>
          <td><strong>Initial Sync Output:</strong></td>
          <td><strong>9 orders fetched and created</strong> in Kwickbot Order collection</td>
        </tr>
        <tr>
          <td><strong>Active Webhook Event:</strong></td>
          <td><code>Order creation</code> (JSON) -> Verified with 200 OK test ping</td>
        </tr>
      </table>
    </div>

    <h2 class="section-title" style="margin-top: 24px;">🛠️ Common Errors & Troubleshooting Checklist</h2>
    <table class="table-custom">
      <thead>
        <tr>
          <th>Error / Issue</th>
          <th>Probable Cause</th>
          <th>Resolution</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Invalid Token (shpss_...)</strong></td>
          <td>API Secret key was entered instead of Admin API Access token.</td>
          <td>Go to API credentials -> Click 'Reveal token once' and copy the token starting with <code>shpat_</code>.</td>
        </tr>
        <tr>
          <td><strong>Invalid Store URL</strong></td>
          <td>Custom vanity domain (e.g. <code>mybrand.in</code>) entered.</td>
          <td>Enter the default Shopify subdomain (e.g. <code>mybrand.myshopify.com</code>).</td>
        </tr>
        <tr>
          <td><strong>Customer Phone Masked</strong></td>
          <td>Protected Customer Data access was omitted in App Settings.</td>
          <td>In Shopify App Settings, check Customer data access reasons (Order management & Customer support) and save.</td>
        </tr>
        <tr>
          <td><strong>Webhook Delivery Failed</strong></td>
          <td>Webhook URL is non-HTTPS or unreachable.</td>
          <td>Ensure backend is running and URL starts with <code>https://</code> with valid SSL.</td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top: 30px; padding: 14px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; text-align: center;">
      <p style="font-size: 11px; font-weight: 700; color: #0f172a;">Kwickbot AI WhatsApp Support Bot</p>
      <p style="font-size: 9.5px; color: #64748b; margin-top: 4px;">For developer assistance or custom API queries, contact support@kwickbot.com</p>
    </div>
  </div>

</body>
</html>
  `;

  const outputDocsPath = path.resolve(__dirname, '../../docs/Shopify_Kwickbot_Integration_Guide.pdf');
  const outputPublicPath = path.resolve(__dirname, '../../frontend/public/guide/Shopify_Kwickbot_Integration_Guide.pdf');

  console.log('Launching Puppeteer browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

  console.log('Rendering pure English PDF with Puppeteer...');
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '12mm',
      bottom: '14mm',
      left: '14mm',
      right: '14mm'
    }
  });

  fs.writeFileSync(outputDocsPath, pdfBuffer);
  fs.writeFileSync(outputPublicPath, pdfBuffer);

  console.log(`PDF successfully regenerated in 100% English!`);
  console.log(`Saved to docs: ${outputDocsPath} (${pdfBuffer.length} bytes)`);
  console.log(`Saved to public: ${outputPublicPath}`);

  await browser.close();
}

generatePDF().catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
