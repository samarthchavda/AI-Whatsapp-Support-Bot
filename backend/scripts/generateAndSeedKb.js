const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
require('dotenv').config();

const Admin = require('../models/Admin');
const KnowledgeBase = require('../models/KnowledgeBase');
const KnowledgeBaseChunk = require('../models/KnowledgeBaseChunk');
const knowledgeBaseService = require('../services/knowledgeBaseService');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/whatsapp-bot';

// Define rich, full-page texts for each page
const page1Text = `
ElectroCore is a premier consumer electronics brand dedicated to delivering state-of-the-art smart accessories and high-fidelity audio equipment. Founded in 2021 with a mission to merge premium sound engineering with rugged, everyday design, our company has quickly become a leader in high-performance portable electronics. Our corporate headquarters and research lab is located at Sector 62, Noida, Uttar Pradesh, India. All shipping, warranty exchanges, and physical returns are processed and dispatched from our central fulfillment center in Mumbai, Maharashtra. We maintain strict manufacturing quality standards, ensuring all of our electronics carry proper Bureau of Indian Standards (BIS) certifications and are packed using eco-friendly, recyclable materials.

Our customer support channels are staffed as follows:
- WhatsApp Support: Available 24/7 (Automated AI response for FAQs, tracking, and common issues).
- Email Support: care@electrocore.in (Response within 4 hours for order queries and technical assistance).
- Live Human Handoff: Available Monday to Saturday, 10:00 AM to 7:00 PM IST (excluding national holidays).

Shipping Policies & Delivery Guidelines:
- Free Domestic Shipping: Applicable to all orders over ₹999 within India.
- Standard Shipping: Flat fee of ₹80 for orders below ₹999. Delivery takes 3 to 5 business days for metro areas.
- Express Delivery: Available in major metro cities for a fee of ₹199. Orders are delivered in 1 to 2 business days.
- Order Processing: Orders placed before 1:00 PM IST are processed and shipped the same business day. Orders placed after 1:00 PM IST are processed and shipped the next business day.
- Delivery Partners: We ship exclusively through premium logistics networks (Blue Dart, Delhivery, DTDC) to guarantee safety. A signature is required upon delivery for all shipments with invoice values exceeding ₹5,000.
- International Orders: We currently ship to all pincodes within India. International shipping is not supported at this time.
`.trim();

const page2Text = `
Returns Policy & Eligibility:
- Return Window: Customers can request returns or exchanges within 14 days of delivery.
- Product Condition: Items must be in original, unused packaging with all manuals, serial number stickers, accessories, and warranty cards intact. Used items, or items with cosmetic scratches, scuffs, or signs of wear, are not eligible for returns and will be sent back.
- Hygienic Exclusions: In-ear accessories (such as silicone ear tips) are excluded from returns unless they arrive defective.
- Return Pickups: Free reverse pickup is provided for all valid returns in eligible pin codes across India. If a pincode is not serviceable for reverse pickup, the customer must self-ship the item, and shipping costs will be reimbursed up to ₹150 upon receiving a valid receipt.

Refund Processing:
- Mode of Refund: Refunds are credited back to the original payment source (Credit/Debit Card, UPI, Netbanking).
- Cash on Delivery (COD) Refunds: For COD orders, customers must log in to the support portal and share bank account details (Bank Name, Account Holder, IFSC Code, Account Number).
- Processing Timeline: Once the returned item is inspected at our Mumbai warehouse, refunds are initiated within 5 to 7 working days.
- Shipping Reimbursement: Original shipping charges and express delivery fees are non-refundable.

Order Cancellations & Modifications:
- Grace Period: Orders can be cancelled or edited (change variant, update shipping address, or modify quantity) within 30 minutes of order confirmation.
- Post-Grace Period: After 30 minutes, orders are locked and passed to the warehouse. At this point, the order cannot be cancelled, and customers must follow the return process after delivery.
`.trim();

const page3Text = `
1. ElectroCore WaveBuds Pro
- Price: ₹4,999 (Inclusive of all taxes).
- Color Options: Obsidian Black, Arctic White, Midnight Blue.
- Battery Life: Up to 40 hours of playtime with the charging case (8 hours per charge). Supports Fast Charge (10 mins charge = 2 hours playtime).
- Core Features: Active Noise Cancellation (ANC) up to 32dB, IPX7 water resistance, ultra-low latency gaming mode (45ms), touch controls, and Qi wireless charging compatibility.
- Warranty: 1-year limited warranty covering manufacturing defects.

2. ElectroCore ChargePad Pro
- Price: ₹2,499.
- Output Power: 15W Qi-compatible wireless fast charging.
- Compatibility: Supports iPhone 12 and above, Samsung Galaxy S20 and above, and WaveBuds Pro wireless case.
- Safety: Integrated foreign object detection (FOD), over-temperature protection, and short-circuit prevention. Non-slip silicone surface with premium matte finish.

3. ElectroCore SoundBar Max
- Price: ₹9,999.
- Audio Output: 120W RMS cinematic soundbar with wired subwoofer.
- Connectivity: Bluetooth 5.3, HDMI ARC, Optical, AUX.
- Audio Modes: Movie, News, Music, 3D Surround Sound. Smart LED display on front panel.

4. ElectroCore PulseFit Watch 2
- Price: ₹3,999.
- Display: 1.85-inch AMOLED screen.
- Health Tracking: Heart rate monitoring, SpO2 tracker, sleep analysis, step tracker.
- Specifications: IP68 dust and water resistance, over 100 sports modes, up to 10 days battery life, and Bluetooth calling.

5. ElectroCore PowerGrid 20K
- Price: ₹1,999.
- Capacity: 20,000mAh capacity.
- Power Output: Power Delivery (PD) 22.5W fast charging, dual USB-A output ports, type-C input/output, smart LED display.
`.trim();

const page4Text = `
Q1. How do I reset my ElectroCore WaveBuds Pro?
A: 1. Place both earbuds inside the charging case and keep the lid open.
2. Press and hold the physical reset button on the back of the case for 10 seconds.
3. The LED indicator light will flash red three times, indicating the reset is successful.
4. Delete 'WaveBuds Pro' from your device's Bluetooth list and pair again.

Q2. What should I do if my wireless ChargePad Pro is flashing red?
A: A flashing red light indicates foreign object detection (e.g. metal phone case, coins, keys on the pad). Remove the phone, ensure there are no metal plates or credit cards inside the case, and place the device back on the center of the pad.

Q3. Does the SoundBar Max support wireless TV connection?
A: Yes, you can connect the SoundBar Max to any smart TV wirelessly via Bluetooth 5.3. However, for the best audio sync and Dolby Digital performance, we highly recommend using an HDMI ARC cable.

Q4. Why is my PulseFit Watch 2 not syncing notifications?
A: Ensure the 'ElectroCore Fit' app has permission to access notifications in your phone's settings. Make sure Bluetooth is turned on, battery optimization is disabled for the app, and the watch is within 10 meters of the phone.

Q5. My PowerGrid 20K is charging slowly. What adapter should I use?
A: To charge the PowerGrid 20K at maximum speed, use a Type-C Power Delivery (PD) fast-charging adapter of 18W or higher, along with a compatible high-amperage Type-C to Type-C cable. Standard 5W mobile chargers will charge it very slowly.

Q6. What should I do if only one of my WaveBuds Pro earbuds has audio?
A: Ensure both earbuds are charged. Clean the golden charging pins on the earbuds and inside the case. Put both back in the case, close the lid for 5 seconds, and take them out together to auto-pair. If the issue persists, perform a factory reset.
`.trim();

// Combine all pages for database storage
const pdfText = `
ElectroCore - Next-Gen Smart Tech & Audio Devices
Official Corporate Information, Product Catalog & Operations Manual

Page 1: Company Profile & Core Support Policies
${page1Text}

Page 2: Returns, Refunds, & Cancellations
${page2Text}

Page 3: Audio Product Catalog & Specifications
${page3Text}

Page 4: Troubleshooting FAQs
${page4Text}
`.trim();

function createPageHeader(doc, pageNum) {
  doc.fillColor('#4f46e5')
     .fontSize(14)
     .font('Helvetica-Bold')
     .text('ElectroCore — Support Manual & FAQ', { align: 'left' });
  doc.fillColor('#94a3b8')
     .fontSize(8)
     .font('Helvetica')
     .text(`Page ${pageNum} of 4  |  Product Knowledge Base`, { align: 'right' });
  doc.moveDown(0.2);
  doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(1.0);
}

function createPageFooter(doc) {
  doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(50, 750).lineTo(545, 750).stroke();
  doc.fillColor('#94a3b8')
     .fontSize(8)
     .font('Helvetica')
     .text('Confidential  |  ElectroCore Electronics India Pvt Ltd  |  support@electrocore.in', 50, 760, { align: 'center' });
}

async function buildPDF(destPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        info: {
          Title: 'ElectroCore Next-Gen Smart Tech & Audio Devices Manual',
          Author: 'ElectroCore Team',
          Subject: 'Product Catalog, Shipping, Returns and Troubleshooting FAQ Guide'
        }
      });

      const writeStream = fs.createWriteStream(destPath);
      doc.pipe(writeStream);

      const textColor = '#334155';
      const headingColor = '#0f172a';

      // --- PAGE 1 ---
      createPageHeader(doc, 1);
      doc.fillColor(headingColor).fontSize(12).font('Helvetica-Bold').text('1. Company Profile & Core Support Policies');
      doc.moveDown(0.5);
      doc.fillColor(textColor).fontSize(9.5).font('Helvetica').text(page1Text, { align: 'justify', lineGap: 3.5 });
      createPageFooter(doc);

      // --- PAGE 2 ---
      doc.addPage();
      createPageHeader(doc, 2);
      doc.fillColor(headingColor).fontSize(12).font('Helvetica-Bold').text('2. Returns, Refunds, & Cancellations');
      doc.moveDown(0.5);
      doc.fillColor(textColor).fontSize(9.5).font('Helvetica').text(page2Text, { align: 'justify', lineGap: 3.5 });
      createPageFooter(doc);

      // --- PAGE 3 ---
      doc.addPage();
      createPageHeader(doc, 3);
      doc.fillColor(headingColor).fontSize(12).font('Helvetica-Bold').text('3. Audio Product Catalog & Specifications');
      doc.moveDown(0.5);
      doc.fillColor(textColor).fontSize(9.5).font('Helvetica').text(page3Text, { align: 'justify', lineGap: 3.5 });
      createPageFooter(doc);

      // --- PAGE 4 ---
      doc.addPage();
      createPageHeader(doc, 4);
      doc.fillColor(headingColor).fontSize(12).font('Helvetica-Bold').text('4. Troubleshooting FAQs');
      doc.moveDown(0.5);
      doc.fillColor(textColor).fontSize(9.5).font('Helvetica').text(page4Text, { align: 'justify', lineGap: 3.5 });
      createPageFooter(doc);

      doc.end();

      writeStream.on('finish', () => resolve());
      writeStream.on('error', (err) => reject(err));
    } catch (e) {
      reject(e);
    }
  });
}

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔌 Connected to MongoDB');

    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const pdfPath = path.join(uploadsDir, 'electrocore_knowledge_base.pdf');
    console.log('🏗️ Generating 4-page PDF guide...');
    await buildPDF(pdfPath);
    console.log('✅ PDF generated successfully at:', pdfPath);

    const admins = await Admin.find({});
    console.log(`👤 Found ${admins.length} admins. Seeding knowledge base...`);

    for (const admin of admins) {
      // Clear old entries
      const existing = await KnowledgeBase.findOne({ 
        uploadedBy: admin._id, 
        fileName: 'electrocore_knowledge_base.pdf' 
      });

      if (existing) {
        console.log(`🗑️ Removing old ElectroCore document for ${admin.email}...`);
        await KnowledgeBaseChunk.deleteMany({ knowledgeBaseId: existing._id });
        await KnowledgeBase.findByIdAndDelete(existing._id);
      }

      const fileSize = fs.statSync(pdfPath).size;
      const kbEntry = new KnowledgeBase({
        title: 'ElectroCore Next-Gen Support Manual',
        description: 'Complete corporate information, shipping policies, returns guidelines, product specs, and troubleshooting FAQs for ElectroCore devices.',
        fileType: 'pdf',
        fileName: 'electrocore_knowledge_base.pdf',
        filePath: pdfPath,
        fileSize: fileSize,
        extractedText: pdfText,
        textLength: pdfText.length,
        uploadedBy: admin._id,
        uploadedByName: admin.name
      });

      await kbEntry.save();
      console.log(`✅ Seeded KnowledgeBase document for ${admin.email}`);

      // Embed chunks into RAG
      try {
        await knowledgeBaseService.processAndSaveChunks(kbEntry);
        console.log(`✅ Vector chunks created for ${admin.email}`);
      } catch (err) {
        console.error(`❌ Embedding failed for ${admin.email}:`, err.message);
      }
    }

    console.log('🎉 Seeding successfully completed!');

  } catch (err) {
    console.error('❌ Failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected');
  }
}

main();
