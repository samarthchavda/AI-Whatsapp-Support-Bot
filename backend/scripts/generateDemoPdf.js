const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const dotenv = require('dotenv');

// Load env variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const Admin = require('../models/Admin');
const KnowledgeBase = require('../models/KnowledgeBase');
const knowledgeBaseService = require('../services/knowledgeBaseService');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/whatsapp-bot';

async function generatePDF(destPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        info: {
          Title: 'WhatsApp Business API Onboarding & Data Requirements Guide',
          Author: 'AI Support Bot Platform',
          Subject: 'Integration Guidelines & Knowledge Base Setup Requirements'
        }
      });

      const writeStream = fs.createWriteStream(destPath);
      doc.pipe(writeStream);

      // Color Palette
      const primaryColor = '#4f46e5'; // Indigo
      const secondaryColor = '#0f172a'; // Slate
      const textColor = '#334155'; // Dark slate
      const accentColor = '#25d366'; // WhatsApp Green

      // ---------------- Header ----------------
      doc.fillColor(primaryColor)
         .fontSize(22)
         .font('Helvetica-Bold')
         .text('AI WhatsApp Support Bot Integration Guide', { align: 'center' });
      
      doc.moveDown(0.2);
      
      doc.fillColor(textColor)
         .fontSize(10)
         .font('Helvetica-Oblique')
         .text('Onboarding Requirements, Credentials Setup, & Data Guidelines', { align: 'center' });

      doc.moveDown(0.8);
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1.5);

      // ---------------- Overview ----------------
      doc.fillColor(secondaryColor)
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('1. Overview & Setup Prerequisites');
      doc.moveDown(0.5);

      doc.fillColor(textColor)
         .fontSize(10.5)
         .font('Helvetica')
         .text(
           'This guide details the prerequisites, API credentials, and knowledge base structures required to connect your e-commerce storefront with our AI-powered WhatsApp Support assistant. By following these steps, you will establish a reliable, automated customer support channel.',
           { align: 'justify', lineGap: 4 }
         );
      doc.moveDown(1.2);

      // ---------------- Meta Developer Console Credentials ----------------
      doc.fillColor(secondaryColor)
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('2. Meta Developer Console Credentials');
      doc.moveDown(0.5);

      doc.fillColor(textColor)
         .fontSize(10.5)
         .font('Helvetica')
         .text('To link the official WhatsApp Business Cloud API, you must procure three crucial credentials from developers.facebook.com:', { lineGap: 3 });
      doc.moveDown(0.5);

      const credentials = [
        { name: 'Temporary/Permanent Access Token: ', desc: 'Generated from Meta App Dashboard. Represents authorization token to send customer replies.' },
        { name: 'Phone Number ID: ', desc: 'A unique identifier representing the active phone line registered on Meta.' },
        { name: 'WhatsApp Business Account ID: ', desc: 'The overarching account representing your business portfolio.' }
      ];

      credentials.forEach(cred => {
        doc.fillColor(primaryColor).font('Helvetica-Bold').text('  • ' + cred.name, { continued: true });
        doc.fillColor(textColor).font('Helvetica').text(cred.desc, { lineGap: 3 });
        doc.moveDown(0.2);
      });
      doc.moveDown(1.0);

      // ---------------- Phone Number Requirements ----------------
      doc.fillColor(secondaryColor)
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('3. Phone Number Prerequisites');
      doc.moveDown(0.5);

      doc.fillColor(textColor)
         .fontSize(10.5)
         .font('Helvetica')
         .text(
           'IMPORTANT: The phone number used for the API integration MUST NOT be actively logged into a physical WhatsApp or WhatsApp Business mobile app. If the number is currently registered on a device, you must delete that account in the app settings (Settings > Account > Delete my account) before entering it in the Meta Developer Console. Once connected to the API, the phone number will be managed programmatically.',
           { align: 'justify', lineGap: 4 }
         );
      doc.moveDown(1.2);

      // ---------------- Knowledge Base Formatting Guidelines ----------------
      doc.fillColor(secondaryColor)
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('4. Knowledge Base & RAG Formatting Guidelines');
      doc.moveDown(0.5);

      doc.fillColor(textColor)
         .fontSize(10.5)
         .font('Helvetica')
         .text(
           'To ensure the AI agent responds accurately to user queries, your uploaded knowledge base files should align with the following specifications:',
           { lineGap: 4 }
         );
      doc.moveDown(0.5);

      const guidelines = [
        { type: 'PDF Documents: ', desc: 'Best for policy manuals, shipping FAQs, and catalogs. Write in clear paragraphs with bold headers. Avoid complex tables.' },
        { type: 'Plain Text (TXT): ', desc: 'Use simple Question and Answer formatting. E.g., "Q: What is the delivery fee? A: Standard shipping is free on orders over $99."' },
        { type: 'Tabular Data (CSV): ', desc: 'Structure product specifications or Q&A catalogs with consistent headers (e.g. Question, Answer) for vector chunk parsing.' },
        { type: 'URLs (Web Scraping): ', desc: 'Provide public links to Help Centers or FAQs. Pages must be static and not protected by logins, CAPTCHAs, or heavy dynamic JavaScript.' }
      ];

      guidelines.forEach(guide => {
        doc.fillColor(accentColor).font('Helvetica-Bold').text('  • ' + guide.type, { continued: true });
        doc.fillColor(textColor).font('Helvetica').text(guide.desc, { lineGap: 3 });
        doc.moveDown(0.2);
      });
      doc.moveDown(1.0);

      // ---------------- Footer/Escalation ----------------
      doc.fillColor(secondaryColor)
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('5. Webhook Configurations & Live Chat Escalation');
      doc.moveDown(0.5);

      doc.fillColor(textColor)
         .fontSize(10.5)
         .font('Helvetica')
         .text(
           'For incoming messages to reach the AI bot, configure the Webhook Web URL and Verification Token inside the Meta Developer Console under "WhatsApp > Configuration". When customer queries fall below the confidence threshold or ask for live agents, the conversation is automatically escalated and a notification is sent to the human operator panel.',
           { align: 'justify', lineGap: 4 }
         );

      doc.moveDown(1.5);
      doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(8)
         .fillColor('#94a3b8')
         .text('Version 1.0.0  |  AI Support Bot Platform Documentation  |  Confidential & Proprietary', { align: 'center' });

      // End document
      doc.end();

      writeStream.on('finish', () => {
        resolve();
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔌 Connected to MongoDB');

    // Create directories if they don't exist
    const uploadsDir = path.join(__dirname, '../uploads');
    const publicDocsDir = path.join(__dirname, '../../frontend/public/docs');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(publicDocsDir)) {
      fs.mkdirSync(publicDocsDir, { recursive: true });
    }

    // Paths for Store FAQ Template
    const ecothreadSourcePath = path.join(__dirname, '../../ecothread_knowledge_base.pdf');
    const templateUploadPath = path.join(uploadsDir, 'sample_store_faq_template.pdf');
    const templatePublicPath = path.join(publicDocsDir, 'sample_store_faq_template.pdf');

    // Copy ecothread sample FAQ PDF
    if (fs.existsSync(ecothreadSourcePath)) {
      console.log('📄 Copying ecothread sample FAQ PDF...');
      fs.copyFileSync(ecothreadSourcePath, templateUploadPath);
      fs.copyFileSync(ecothreadSourcePath, templatePublicPath);
      console.log('✅ Copied sample FAQ PDFs successfully!');
    } else {
      console.warn('⚠️ Source ecothread_knowledge_base.pdf not found in project root!');
    }

    // Clean up old static files if they exist
    const oldPublicPdf = path.join(publicDocsDir, 'whatsapp_integration_guide.pdf');
    const oldUploadPdf = path.join(uploadsDir, 'whatsapp_integration_guide.pdf');
    if (fs.existsSync(oldPublicPdf)) {
      try { fs.unlinkSync(oldPublicPdf); } catch (e) {}
    }
    if (fs.existsSync(oldUploadPdf)) {
      try { fs.unlinkSync(oldUploadPdf); } catch (e) {}
    }

    // Find all merchants
    const admins = await Admin.find({});
    console.log(`👤 Found ${admins.length} admins to seed.`);

    for (const admin of admins) {
      const KnowledgeBaseChunk = require('../models/KnowledgeBaseChunk');

      // --- A. REMOVE OLD SETUP GUIDE FROM DATABASE ---
      const existingGuide = await KnowledgeBase.findOne({ 
        uploadedBy: admin._id, 
        fileName: 'whatsapp_integration_guide.pdf' 
      });

      if (existingGuide) {
        console.log(`🗑️ Removing old guide document for admin ${admin.email}...`);
        await KnowledgeBaseChunk.deleteMany({ knowledgeBaseId: existingGuide._id });
        await KnowledgeBase.findByIdAndDelete(existingGuide._id);
      }

      // --- B. SEED SAMPLE STORE FAQ TEMPLATE ---
      if (fs.existsSync(templateUploadPath)) {
        const existingTemplate = await KnowledgeBase.findOne({ 
          uploadedBy: admin._id, 
          fileName: 'sample_store_faq_template.pdf' 
        });

        if (existingTemplate) {
          console.log(`⚠️ FAQ Template already seeded for admin ${admin.email}. Overwriting...`);
          await KnowledgeBaseChunk.deleteMany({ knowledgeBaseId: existingTemplate._id });
          await KnowledgeBase.findByIdAndDelete(existingTemplate._id);
        }

        const templateSize = fs.statSync(templateUploadPath).size;
        const templateTitle = 'EcoThread Sample Store FAQ Template';
        const templateDescription = 'A professional reference template showing clean formatting of returns, shipping rates, and support details for AI Knowledge Base ingestion.';
        const templateText = `
EcoThread - Premium Sustainable Fashion Store
Official Store Policies, FAQs & Knowledge Base Guidelines

1. Store Overview
EcoThread is a premium sustainable apparel brand. All our clothing items are crafted from 100% GOTS-certified organic cotton, organic linen, and recycled ocean plastics. We operate online and fulfill orders from our eco-friendly warehouse in Denver, Colorado.

2. Shipping Policies & Rates
- Free Shipping: Available for all domestic orders over $75.00.
- Standard Shipping: $5.99 flat rate for orders under $75.00. Delivery takes 3 to 5 business days.
- Express Shipping: $14.99 flat rate. Delivery takes 1 to 2 business days.
- Processing Time: All orders placed before 2:00 PM EST are processed and shipped the same business day. Orders placed after 2:00 PM EST or on weekends are processed the following business day.
- International Shipping: We currently ship to the United States and Canada only. Canadian orders are subject to a $15.00 flat rate shipping fee and may incur custom duties.

3. Returns & Refunds Policy
- Return Window: Customers can return any unworn, unwashed item with original tags attached within 30 days of the delivery date.
- Return Fees: Returns are 100% free! We provide a pre-paid printable return label upon request.
- How to Return: Open a support ticket, print the prepaid label, pack the item securely, and drop it off at any USPS mailbox or post office.
- Refund Processing: Once we receive and inspect the returned item at our warehouse, refunds are processed back to the original payment method within 5 to 7 business days.
- Final Sale Items: Items purchased from our Clearance section or marked 'Final Sale' are not eligible for returns, exchanges, or refunds.

4. Order Cancellations & Modifications
- Cancellation Grace Period: Orders can be cancelled or modified (such as changing shipping address, item size, or color) within 1 hour of placing the order.
- Post-Grace Period: After 1 hour, orders are automatically sent to our Denver warehouse team for packing. At this stage, the order cannot be cancelled or modified. The customer must wait for delivery and initiate a standard return.

5. Contact & Support Hours
- Email Support: support@ecothread.co (Average response time: under 2 hours)
- WhatsApp Support: Direct automated responses 24/7. Live agent handoff is available during working hours.
- Operating Hours: Monday to Friday, 9:00 AM to 6:00 PM EST (excluding public US holidays).
        `.trim();

        const kbTemplate = new KnowledgeBase({
          title: templateTitle,
          description: templateDescription,
          fileType: 'pdf',
          fileName: 'sample_store_faq_template.pdf',
          filePath: templateUploadPath,
          fileSize: templateSize,
          extractedText: templateText,
          textLength: templateText.length,
          uploadedBy: admin._id,
          uploadedByName: admin.name
        });

        await kbTemplate.save();
        console.log(`✅ Seeded FAQ Template entry for ${admin.email}`);

        // Generate vector chunks for RAG
        try {
          await knowledgeBaseService.processAndSaveChunks(kbTemplate);
          console.log(`✅ Seeded vector chunks for FAQ Template for ${admin.email}`);
        } catch (chunkErr) {
          console.error(`❌ Failed to chunk/embed FAQ Template for ${admin.email}:`, chunkErr);
        }
      }
    }

    console.log('🎉 Seeding successfully completed!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

main();
