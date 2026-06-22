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

const pdfText = `
ElectroCore - Next-Gen Smart Tech & Audio Devices
Official Corporate Information, Product Catalog & Operations Manual

Page 1: Company Profile & Core Support Policies
Company Profile:
ElectroCore is a premier consumer electronics brand dedicated to delivering state-of-the-art smart accessories and high-fidelity audio equipment. Our corporate headquarters is located at Sector 62, Noida, Uttar Pradesh, India. All orders are dispatched from our central fulfillment center in Mumbai.

Support Channels & Hours:
- WhatsApp Support: Available 24/7 (Automated AI response).
- Email Support: care@electrocore.in (Response within 4 hours).
- Live Human Handoff: Available Monday to Saturday, 10:00 AM to 7:00 PM IST (excluding national holidays).

Shipping Policies:
- Free Shipping: Applicable to all orders over ₹999 within India.
- Standard Shipping: Flat fee of ₹80 for orders below ₹999. Delivery takes 3 to 5 business days.
- Express Delivery: Available in major metro cities for ₹199. Delivery takes 1 to 2 business days.
- Order Processing: Orders placed before 1:00 PM IST are processed and shipped the same business day.

Page 2: Returns, Refunds, & Cancellations
Returns Policy:
- Return Window: Customers can request returns within 14 days of delivery.
- Product Condition: Items must be in original packaging with all manuals, accessories, and warranty cards intact. Used items are not eligible for returns.
- Return Pickup: Free reverse pickup is provided for all valid returns in eligible pin codes.

Refunds:
- Mode of Refund: Refunds are credited back to the original payment source (Credit/Debit Card, UPI, Netbanking). For Cash on Delivery (COD) orders, customer must provide bank account details.
- Processing Timeline: Once the returned item is inspected at our Mumbai warehouse, refunds are initiated within 5 to 7 working days.

Order Cancellations:
- Grace Period: Orders can be cancelled or edited (address, size, product variant) within 30 minutes of order confirmation.
- Post-Grace Period: After 30 minutes, orders are locked and passed to the warehouse. At this point, the order cannot be cancelled, and customers must follow the return process after delivery.

Page 3: Audio Product Catalog & Specifications
1. ElectroCore WaveBuds Pro
- Price: ₹4,999 (Inclusive of all taxes).
- Color Options: Obsidian Black, Arctic White, Midnight Blue.
- Battery Life: Up to 40 hours of playtime with the charging case (8 hours per charge).
- Core Features: Active Noise Cancellation (ANC) up to 32dB, IPX7 water resistance, ultra-low latency gaming mode (45ms).
- Warranty: 1-year limited warranty covering manufacturing defects.

2. ElectroCore ChargePad Pro
- Price: ₹2,499.
- Output Power: 15W Qi-compatible wireless fast charging.
- Compatibility: Supports iPhone 12 and above, Samsung Galaxy S20 and above, and WaveBuds Pro wireless case.
- Safety: Integrated foreign object detection, over-temperature protection, and short-circuit prevention.

3. ElectroCore SoundBar Max
- Price: ₹9,999.
- Audio Output: 120W cinematic soundbar with wired subwoofer.
- Connectivity: Bluetooth 5.3, HDMI ARC, Optical, AUX.
- Audio Modes: Movie, News, Music, 3D Surround Sound.

Page 4: Troubleshooting FAQs
Q1. How do I reset my ElectroCore WaveBuds Pro?
A: 1. Place both earbuds inside the charging case and keep the lid open.
2. Press and hold the physical reset button on the back of the case for 10 seconds.
3. The LED indicator light will flash red three times, indicating the reset is successful.
4. Delete 'WaveBuds Pro' from your device's Bluetooth list and pair again.

Q2. What should I do if my wireless ChargePad Pro is flashing red?
A: A flashing red light indicates foreign object detection (e.g. metal phone case, coins, keys on the pad). Remove the phone, ensure there are no metal plates or credit cards inside the case, and place the device back on the center of the pad.

Q3. Does the SoundBar Max support wireless TV connection?
A: Yes, you can connect the SoundBar Max to any smart TV wirelessly via Bluetooth 5.3. However, for the best audio sync and Dolby Digital performance, we highly recommend using an HDMI ARC cable.
`.trim();

function createPageHeader(doc, pageNum) {
  doc.fillColor('#4f46e5')
     .fontSize(16)
     .font('Helvetica-Bold')
     .text('ElectroCore — Support Manual & FAQ', { align: 'left' });
  doc.fillColor('#94a3b8')
     .fontSize(9)
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
      doc.fillColor(headingColor).fontSize(14).font('Helvetica-Bold').text('1. Company Profile & Core Support Policies');
      doc.moveDown(0.5);
      doc.fillColor(textColor).fontSize(10).font('Helvetica').text(
        'ElectroCore is a premier consumer electronics brand dedicated to delivering state-of-the-art smart accessories and high-fidelity audio equipment. Our corporate headquarters is located at Sector 62, Noida, Uttar Pradesh, India. All orders are dispatched from our central fulfillment center in Mumbai.\n\n' +
        'Our customer support channels are staffed as follows:\n' +
        '  • WhatsApp Support: Available 24/7 (Automated AI response).\n' +
        '  • Email Support: care@electrocore.in (Response within 4 hours).\n' +
        '  • Live Human Handoff: Available Monday to Saturday, 10:00 AM to 7:00 PM IST (excluding national holidays).\n\n' +
        'Shipping Policies & Guidelines:\n' +
        '  • Free Shipping: Applicable to all orders over ₹999 within India.\n' +
        '  • Standard Shipping: Flat fee of ₹80 for orders below ₹999. Delivery takes 3 to 5 business days.\n' +
        '  • Express Delivery: Available in major metro cities for ₹199. Delivery takes 1 to 2 business days.\n' +
        '  • Order Processing: Orders placed before 1:00 PM IST are processed and shipped the same business day. Orders placed after 1:00 PM IST are processed the next business day.',
        { align: 'justify', lineGap: 4 }
      );
      createPageFooter(doc);

      // --- PAGE 2 ---
      doc.addPage();
      createPageHeader(doc, 2);
      doc.fillColor(headingColor).fontSize(14).font('Helvetica-Bold').text('2. Returns, Refunds, & Cancellations');
      doc.moveDown(0.5);
      doc.fillColor(textColor).fontSize(10).font('Helvetica').text(
        'Returns Policy & Eligibility:\n' +
        '  • Return Window: Customers can request returns within 14 days of delivery.\n' +
        '  • Product Condition: Items must be in original packaging with all manuals, accessories, and warranty cards intact. Used items or items with scratch marks are not eligible for returns.\n' +
        '  • Return Pickup: Free reverse pickup is provided for all valid returns in eligible pin codes across India.\n\n' +
        'Refund Processing:\n' +
        '  • Mode of Refund: Refunds are credited back to the original payment source (Credit/Debit Card, UPI, Netbanking). For Cash on Delivery (COD) orders, customers must provide valid bank account details.\n' +
        '  • Processing Timeline: Once the returned item is inspected at our Mumbai warehouse, refunds are initiated within 5 to 7 working days.\n\n' +
        'Order Cancellations:\n' +
        '  • Grace Period: Orders can be cancelled or edited (address, size, product variant) within 30 minutes of order confirmation.\n' +
        '  • Post-Grace Period: After 30 minutes, orders are locked and passed to the warehouse. At this point, the order cannot be cancelled, and customers must follow the return process after delivery.',
        { align: 'justify', lineGap: 4 }
      );
      createPageFooter(doc);

      // --- PAGE 3 ---
      doc.addPage();
      createPageHeader(doc, 3);
      doc.fillColor(headingColor).fontSize(14).font('Helvetica-Bold').text('3. Audio Product Catalog & Specifications');
      doc.moveDown(0.5);
      doc.fillColor(textColor).fontSize(10).font('Helvetica').text(
        '1. ElectroCore WaveBuds Pro\n' +
        '  • Price: ₹4,999 (Inclusive of all taxes).\n' +
        '  • Color Options: Obsidian Black, Arctic White, Midnight Blue.\n' +
        '  • Battery Life: Up to 40 hours of playtime with the charging case (8 hours per charge).\n' +
        '  • Core Features: Active Noise Cancellation (ANC) up to 32dB, IPX7 water resistance, ultra-low latency gaming mode (45ms).\n' +
        '  • Warranty: 1-year limited warranty covering manufacturing defects.\n\n' +
        '2. ElectroCore ChargePad Pro\n' +
        '  • Price: ₹2,499.\n' +
        '  • Output Power: 15W Qi-compatible wireless fast charging.\n' +
        '  • Compatibility: Supports iPhone 12 and above, Samsung Galaxy S20 and above, and WaveBuds Pro wireless case.\n' +
        '  • Safety: Integrated foreign object detection, over-temperature protection, and short-circuit prevention.\n\n' +
        '3. ElectroCore SoundBar Max\n' +
        '  • Price: ₹9,999.\n' +
        '  • Audio Output: 120W cinematic soundbar with wired subwoofer.\n' +
        '  • Connectivity: Bluetooth 5.3, HDMI ARC, Optical, AUX.\n' +
        '  • Audio Modes: Movie, News, Music, 3D Surround Sound.',
        { align: 'justify', lineGap: 4 }
      );
      createPageFooter(doc);

      // --- PAGE 4 ---
      doc.addPage();
      createPageHeader(doc, 4);
      doc.fillColor(headingColor).fontSize(14).font('Helvetica-Bold').text('4. Troubleshooting FAQs');
      doc.moveDown(0.5);
      doc.fillColor(textColor).fontSize(10).font('Helvetica').text(
        'Q1. How do I reset my ElectroCore WaveBuds Pro?\n' +
        'A: 1. Place both earbuds inside the charging case and keep the lid open.\n' +
        '   2. Press and hold the physical reset button on the back of the case for 10 seconds.\n' +
        '   3. The LED indicator light will flash red three times, indicating the reset is successful.\n' +
        '   4. Delete \'WaveBuds Pro\' from your device\'s Bluetooth list and pair again.\n\n' +
        'Q2. What should I do if my wireless ChargePad Pro is flashing red?\n' +
        'A: A flashing red light indicates foreign object detection (e.g. metal phone case, coins, keys on the pad). Remove the phone, ensure there are no metal plates or credit cards inside the case, and place the device back on the center of the pad.\n\n' +
        'Q3. Does the SoundBar Max support wireless TV connection?\n' +
        'A: Yes, you can connect the SoundBar Max to any smart TV wirelessly via Bluetooth 5.3. However, for the best audio sync and Dolby Digital performance, we highly recommend using an HDMI ARC cable.',
        { align: 'justify', lineGap: 4 }
      );
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
    
    // Test Query
    console.log('\n🔍 Testing Vector Knowledge Base Search...');
    const testAdmin = await Admin.findOne({ email: 'superadmin@gmail.com' });
    if (testAdmin) {
      const query = 'How do I reset my WaveBuds Pro?';
      console.log(`❓ Query: "${query}"`);
      const result = await knowledgeBaseService.queryKnowledgeBase(query, testAdmin._id);
      console.log('🤖 AI Response:\n', result.answer);
      console.log(`🎯 Confidence Score: ${result.confidence}`);
    }

  } catch (err) {
    console.error('❌ Failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected');
  }
}

main();
