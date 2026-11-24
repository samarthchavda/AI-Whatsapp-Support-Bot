const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function buildAiAgentPdf() {
  console.log('Fetching products from database for AI Agent Manual...');
  await mongoose.connect(process.env.MONGODB_URI);
  const KnowledgeBase = require('../models/KnowledgeBase');
  const Admin = require('../models/Admin');

  const admin = await Admin.findOne({ email: 'chavdasamarth007@gmail.com' });
  const products = await KnowledgeBase.find({ uploadedBy: admin._id, fileType: 'product' }).sort({ createdAt: -1 });
  console.log(`Retrieved ${products.length} products for PDF catalog.`);
  await mongoose.disconnect();

  // Group products by category
  const categories = {};
  products.forEach(p => {
    const cat = p.productData?.category || 'General Products';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(p);
  });

  let catalogHtml = '';
  Object.keys(categories).forEach((catName, cIdx) => {
    const items = categories[catName];
    catalogHtml += `
      <div class="category-section ${cIdx > 0 ? 'page-break' : ''}">
        <div class="category-header">
          <span class="category-pill">${catName.toUpperCase()}</span>
          <span class="category-count">${items.length} Products</span>
        </div>
        <div class="product-grid">
    `;

    items.forEach(item => {
      const pData = item.productData || {};
      const img = pData.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80';
      const cleanDesc = (item.extractedText || '').split('Description:')[1] || item.description || 'High-quality verified store item.';

      catalogHtml += `
        <div class="product-card">
          <div class="product-img-box">
            <img src="${img}" alt="${item.title}" onerror="this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80';" />
          </div>
          <div class="product-body">
            <div class="product-badge-row">
              <span class="price-tag">${pData.price || '$0.00'}</span>
              <span class="stock-badge">In Stock (${pData.stock || 20})</span>
            </div>
            <h4 class="product-name">${item.title}</h4>
            <div class="sku-tag">SKU: ${pData.sku || 'N/A'}</div>
            <p class="product-desc-snippet">${cleanDesc.substring(0, 110)}...</p>
          </div>
        </div>
      `;
    });

    catalogHtml += `
        </div>
      </div>
    `;
  });

  const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Kwickbot AI Agent Knowledge Base & Product Catalog</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

    @page {
      size: A4 portrait;
      margin: 12mm 14mm 14mm 14mm;
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-size: 8.5px;
        color: #94a3b8;
      }
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.45;
      font-size: 10px;
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
      padding: 34px 28px;
      page-break-after: always;
      break-after: page;
      border: 2px solid #e2e8f0;
      border-radius: 20px;
      background: linear-gradient(135deg, #090d16 0%, #1e293b 100%);
      color: #ffffff;
    }

    .cover-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255,255,255,0.15);
      padding-bottom: 18px;
    }

    .badge-logo {
      background: #25D366;
      color: #090d16;
      font-weight: 800;
      font-size: 15px;
      padding: 6px 14px;
      border-radius: 10px;
      letter-spacing: 0.5px;
    }

    .badge-doc {
      font-size: 9.5px;
      font-weight: 700;
      background: rgba(255,255,255,0.12);
      color: #e2e8f0;
      padding: 6px 12px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .cover-middle {
      margin: 40px 0;
      text-align: center;
    }

    .cover-kicker {
      font-size: 13px;
      font-weight: 700;
      color: #25D366;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 12px;
    }

    .cover-title {
      font-size: 32px;
      font-weight: 800;
      line-height: 1.25;
      margin-bottom: 18px;
      color: #ffffff;
    }

    .cover-desc {
      font-size: 12.5px;
      color: #94a3b8;
      max-width: 580px;
      margin: 0 auto 28px auto;
      line-height: 1.6;
    }

    .pill-grid {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
      margin-top: 10px;
    }

    .pill-item {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.15);
      padding: 7px 16px;
      border-radius: 30px;
      font-size: 10.5px;
      font-weight: 600;
      color: #f1f5f9;
    }

    .cover-bottom {
      border-top: 1px solid rgba(255,255,255,0.15);
      padding-top: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9.5px;
      color: #94a3b8;
    }

    /* Policy & SOP Cards */
    .section-title {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 6px;
    }

    .section-subtitle {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 16px;
    }

    .sop-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }

    .sop-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px;
    }

    .sop-card h3 {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .sop-card p {
      font-size: 10px;
      color: #475569;
      line-height: 1.5;
    }

    .sop-card ul {
      margin-left: 16px;
      margin-top: 6px;
      font-size: 9.5px;
      color: #334155;
      line-height: 1.5;
    }

    /* AI Conversation Guidelines Table */
    .table-ai {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      font-size: 9.5px;
    }

    .table-ai th {
      background: #0f172a;
      color: #ffffff;
      padding: 8px 10px;
      text-align: left;
      font-weight: 600;
    }

    .table-ai td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
      vertical-align: top;
    }

    .table-ai tr:nth-child(even) { background: #f8fafc; }

    /* Product Catalog Grid */
    .category-section {
      margin-bottom: 20px;
    }

    .category-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      margin-bottom: 12px;
      border-bottom: 2px solid #0f172a;
    }

    .category-pill {
      background: #0f172a;
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 6px;
      letter-spacing: 0.5px;
    }

    .category-count {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
    }

    .product-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }

    .product-card {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
      display: flex;
      flex-direction: column;
    }

    .product-img-box {
      height: 120px;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .product-img-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .product-body {
      padding: 8px 10px;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .product-badge-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .price-tag {
      font-size: 11px;
      font-weight: 800;
      color: #16a34a;
    }

    .stock-badge {
      font-size: 8.5px;
      background: #dcfce7;
      color: #15803d;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .product-name {
      font-size: 10.5px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 2px;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .sku-tag {
      font-size: 8.5px;
      color: #64748b;
      margin-bottom: 4px;
      font-family: monospace;
    }

    .product-desc-snippet {
      font-size: 8.5px;
      color: #475569;
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  </style>
</head>
<body>

  <!-- COVER PAGE -->
  <div class="cover-page">
    <div class="cover-top">
      <span class="badge-logo">KWICKBOT AI</span>
      <span class="badge-doc">Agent Training Manual & Catalog</span>
    </div>

    <div class="cover-middle">
      <div class="cover-kicker">Autonomous Customer Operations</div>
      <h1 class="cover-title">AI WhatsApp Agent<br/>Master Catalog & SOP Handbook</h1>
      <p class="cover-desc">
        Complete enterprise knowledge base manual powering Kwickbot Gemini AI Bot for Shopify. Contains verified product catalog specifications, real-time order tracking logic, store policies, and automated conversation standards.
      </p>

      <div class="pill-grid">
        <span class="pill-item">📦 40 Synced Shopify Products</span>
        <span class="pill-item">⚡ Instant Price & Stock Lookup</span>
        <span class="pill-item">🚚 Shipping & Delivery SOPs</span>
        <span class="pill-item">🔄 7-Day Return & Refund Policy</span>
        <span class="pill-item">🤖 Human Escalation Triggers</span>
        <span class="pill-item">🔐 Verified Store Integration</span>
      </div>
    </div>

    <div class="cover-bottom">
      <div><strong>Store:</strong> AI WhatsApp Demo Store</div>
      <div><strong>Merchant:</strong> chavdasamarth007@gmail.com</div>
      <div><strong>Catalog Version:</strong> 2.0 (November 2026)</div>
    </div>
  </div>

  <!-- SECTION 1: STORE POLICIES & SOPS -->
  <div class="page-break" style="padding-top: 10px;">
    <h2 class="section-title">🏢 Store Policies & Standard Operating Procedures (SOPs)</h2>
    <p class="section-subtitle">Rules, timelines, and operational policies the AI agent must enforce when responding to customers</p>

    <div class="sop-grid">
      <div class="sop-card">
        <h3>🚚 Shipping & Delivery Policy</h3>
        <p>Comprehensive fulfillment and shipping guidelines:</p>
        <ul>
          <li><strong>Processing Time:</strong> Orders dispatched within 24 hours of purchase.</li>
          <li><strong>Delivery Window:</strong> 3 to 5 business days nationwide.</li>
          <li><strong>Shipping Fees:</strong> Free shipping on orders above ₹499. Flat ₹50 for smaller orders.</li>
          <li><strong>Courier Partners:</strong> BlueDart, Delhivery, DTDC, Xpressbees.</li>
          <li><strong>Tracking:</strong> Tracking number and tracking URL provided automatically via WhatsApp.</li>
        </ul>
      </div>

      <div class="sop-card">
        <h3>🔄 Return & Replacement Policy</h3>
        <p>Customer return window and eligibility conditions:</p>
        <ul>
          <li><strong>Return Window:</strong> 7 days from the confirmed delivery date.</li>
          <li><strong>Condition:</strong> Unused, unwashed, with original tags and packaging intact.</li>
          <li><strong>Pickup:</strong> Reverse pickup arranged at the customer's delivery address within 48 hours.</li>
          <li><strong>Exchanges:</strong> Free size and color exchanges supported on all apparel and footwear.</li>
        </ul>
      </div>

      <div class="sop-card">
        <h3>💳 Payment Methods & Security</h3>
        <p>Accepted payment options for store checkout:</p>
        <ul>
          <li><strong>Cash on Delivery (COD):</strong> Available for orders up to ₹5,000.</li>
          <li><strong>UPI Options:</strong> Google Pay, PhonePe, Paytm, BHIM UPI.</li>
          <li><strong>Cards:</strong> Visa, MasterCard, RuPay, American Express.</li>
          <li><strong>Net Banking:</strong> All major Indian banks supported.</li>
        </ul>
      </div>

      <div class="sop-card">
        <h3>💰 Refund & Cancellation SOP</h3>
        <p>Order cancellations and refund processing rules:</p>
        <ul>
          <li><strong>Cancellation:</strong> Allowed anytime before the order status changes to "Shipped".</li>
          <li><strong>Prepaid Refunds:</strong> Credited back to original payment source within 5-7 business days.</li>
          <li><strong>COD Refunds:</strong> Transferred via UPI or direct bank NEFT within 24 hours of return delivery.</li>
        </ul>
      </div>
    </div>

    <h2 class="section-title" style="margin-top: 18px;">🤖 AI Conversation Response Standards</h2>
    <p class="section-subtitle">Behavioral guidelines and expected response styles for the WhatsApp AI assistant</p>

    <table class="table-ai">
      <thead>
        <tr>
          <th>Customer Scenario</th>
          <th>AI Agent Objective</th>
          <th>Required Response Guideline</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Order Status ("Where is my order?")</strong></td>
          <td>Provide live delivery and shipment tracking</td>
          <td>Look up order by Order ID (e.g., #1001) or WhatsApp phone. State status, courier name, and tracking link.</td>
        </tr>
        <tr>
          <td><strong>Product Inquiries ("Price of iPhone / Tent?")</strong></td>
          <td>Deliver accurate catalog specifications</td>
          <td>Retrieve exact price, current stock, SKU, and brief feature highlights from the synced catalog below.</td>
        </tr>
        <tr>
          <td><strong>Return or Damaged Goods Complaint</strong></td>
          <td>De-escalate and guide through 7-day return process</td>
          <td>Acknowledge concern politely, explain the 7-day return policy, and ask for photos if damaged.</td>
        </tr>
        <tr>
          <td><strong>Talk to Human Agent / Escalation</strong></td>
          <td>Transfer conversation to live support agent</td>
          <td>Set conversation status to Escalated, notify merchant team, and inform customer that an agent will join shortly.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- SECTION 2: COMPLETE MASTER PRODUCT CATALOG -->
  <div style="padding-top: 10px;">
    <h2 class="section-title">🛍️ Master Store Product Catalog (40 Live Shopify Items)</h2>
    <p class="section-subtitle">Real-time catalog synchronized from Shopify store: ai-whatsapp-demo-store.myshopify.com</p>

    ${catalogHtml}
  </div>

</body>
</html>
  `;

  const outputDocsPath = path.resolve(__dirname, '../../docs/Kwickbot_AI_Agent_KnowledgeBase_Catalog.pdf');
  const outputPublicPath = path.resolve(__dirname, '../../frontend/public/guide/Kwickbot_AI_Agent_KnowledgeBase_Catalog.pdf');

  console.log('Launching Puppeteer to generate AI Agent Catalog PDF...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

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

  console.log(`AI Agent PDF successfully generated!`);
  console.log(`Saved to: ${outputDocsPath} (${pdfBuffer.length} bytes)`);
  console.log(`Saved to: ${outputPublicPath}`);

  await browser.close();
}

buildAiAgentPdf().catch(err => {
  console.error('Error generating AI Agent PDF:', err);
  process.exit(1);
});
