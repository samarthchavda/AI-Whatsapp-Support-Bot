const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

/**
 * Generate a professional PDF invoice for a merchant subscription plan upgrade.
 * @param {Object} invoice - The Invoice database document
 * @param {Object} admin - The Admin database document
 * @returns {Promise<string>} The local path to the generated PDF file
 */
function generateInvoicePDF(invoice, admin) {
  return new Promise((resolve, reject) => {
    try {
      // Ensure the output directory exists
      const invoicesDir = path.join(__dirname, '../uploads/invoices');
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      const fileName = `${invoice.invoiceNumber}.pdf`;
      const filePath = path.join(invoicesDir, fileName);

      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        info: {
          Title: `Invoice ${invoice.invoiceNumber}`,
          Author: 'Kwickbot',
          Subject: 'Subscription Receipt'
        }
      });

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Color Palette
      const primaryColor = '#6366f1';   // Kwickbot Indigo
      const darkSlate = '#0f172a';      // Slate 900
      const lightSlate = '#475569';     // Slate 600
      const borderSlate = '#e2e8f0';    // Slate 200
      const bgSlate = '#f8fafc';        // Slate 50

      // ---------------- Header / Branding ----------------
      // If kwickbot logo exists, we can place a placeholder or simple styled text
      doc.fillColor(primaryColor)
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('Kwickbot', 50, 50);

      doc.fillColor(lightSlate)
         .fontSize(9)
         .font('Helvetica')
         .text('AI Customer Support Platform', 50, 78);

      // Company info
      doc.fillColor(lightSlate)
         .fontSize(9)
         .font('Helvetica')
         .text('Kwickbot Technologies Pvt Ltd', 50, 95)
         .text('support@kwickbot.in', 50, 108)
         .text('www.kwickbot.in', 50, 121);

      // Invoice Details (Top Right)
      doc.fillColor(darkSlate)
         .fontSize(20)
         .font('Helvetica-Bold')
         .text('INVOICE', 350, 50, { align: 'right' });

      doc.fillColor(lightSlate)
         .fontSize(9.5)
         .font('Helvetica')
         .text(`Invoice No: ${invoice.invoiceNumber}`, 350, 80, { align: 'right' })
         .text(`Date: ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}`, 350, 95, { align: 'right' })
         .text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`, 350, 110, { align: 'right' })
         .fillColor(invoice.paymentStatus === 'completed' ? '#10b981' : '#f59e0b')
         .font('Helvetica-Bold')
         .text(invoice.paymentStatus === 'completed' ? 'PAID' : 'PENDING', 350, 125, { align: 'right' });

      doc.moveDown(2);
      doc.strokeColor(borderSlate).lineWidth(1).moveTo(50, 150).lineTo(545, 150).stroke();

      // ---------------- Bill To Section ----------------
      doc.fillColor(darkSlate)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('BILL TO:', 50, 175);

      doc.fillColor(darkSlate)
         .fontSize(10.5)
         .font('Helvetica-Bold')
         .text(invoice.customerName || 'Merchant', 50, 192);

      if (admin.businessName) {
        doc.fillColor(lightSlate)
           .fontSize(9.5)
           .font('Helvetica')
           .text(admin.businessName, 50, 207);
      }

      doc.fillColor(lightSlate)
         .fontSize(9.5)
         .font('Helvetica')
         .text(`Phone: ${invoice.customerPhone || '—'}`, 50, admin.businessName ? 222 : 207)
         .text(`Email: ${invoice.customerEmail || '—'}`, 50, admin.businessName ? 237 : 222);

      doc.moveDown(1.5);

      // ---------------- Table Header ----------------
      const tableTop = 275;
      doc.rect(50, tableTop, 495, 24).fill(bgSlate);
      
      doc.fillColor(darkSlate)
         .fontSize(9.5)
         .font('Helvetica-Bold')
         .text('Description', 60, tableTop + 7)
         .text('Qty', 350, tableTop + 7, { width: 40, align: 'center' })
         .text('Unit Price (INR)', 400, tableTop + 7, { width: 70, align: 'right' })
         .text('Total (INR)', 480, tableTop + 7, { width: 60, align: 'right' });

      doc.strokeColor(borderSlate).lineWidth(1).moveTo(50, tableTop + 24).lineTo(545, tableTop + 24).stroke();

      // ---------------- Table Rows ----------------
      let currentY = tableTop + 24;
      const items = invoice.items || [];
      
      items.forEach((item, index) => {
        const itemHeight = 32;
        // Draw row bottom border
        doc.strokeColor(borderSlate).lineWidth(0.5).moveTo(50, currentY + itemHeight).lineTo(545, currentY + itemHeight).stroke();

        // Render row cells
        doc.fillColor(darkSlate)
           .fontSize(9.5)
           .font('Helvetica')
           .text(item.description, 60, currentY + 10)
           .text(String(item.quantity), 350, currentY + 10, { width: 40, align: 'center' })
           .text(`₹${item.unitPrice.toLocaleString('en-IN')}`, 400, currentY + 10, { width: 70, align: 'right' })
           .text(`₹${item.amount.toLocaleString('en-IN')}`, 480, currentY + 10, { width: 60, align: 'right' });

        currentY += itemHeight;
      });

      // ---------------- Totals Summary ----------------
      currentY += 15;
      
      // Subtotal
      doc.fillColor(lightSlate)
         .fontSize(9.5)
         .font('Helvetica')
         .text('Subtotal:', 380, currentY, { width: 80, align: 'right' })
         .fillColor(darkSlate)
         .text(`₹${invoice.subtotal.toLocaleString('en-IN')}`, 470, currentY, { width: 75, align: 'right' });

      // Discount (if any)
      if (admin.customDiscount > 0) {
        currentY += 18;
        const discountAmount = (invoice.subtotal * admin.customDiscount) / 100;
        doc.fillColor(lightSlate)
           .fontSize(9.5)
           .text(`Discount (${admin.customDiscount}%):`, 380, currentY, { width: 80, align: 'right' })
           .fillColor('#ef4444')
           .text(`- ₹${discountAmount.toLocaleString('en-IN')}`, 470, currentY, { width: 75, align: 'right' });
      }

      // Total Paid
      currentY += 22;
      doc.rect(370, currentY - 4, 175, 26).fill(primaryColor + '0d'); // 5% opacity
      doc.strokeColor(primaryColor).lineWidth(1).rect(370, currentY - 4, 175, 26).stroke();

      doc.fillColor(primaryColor)
         .fontSize(10.5)
         .font('Helvetica-Bold')
         .text('Total Paid:', 380, currentY + 2, { width: 80, align: 'right' })
         .text(`₹${invoice.totalAmount.toLocaleString('en-IN')}`, 470, currentY + 2, { width: 75, align: 'right' });

      // ---------------- Terms / Thank You ----------------
      doc.fillColor(darkSlate)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('Terms & Notes:', 50, currentY + 60);

      doc.fillColor(lightSlate)
         .fontSize(8.5)
         .font('Helvetica')
         .text('1. This invoice serves as a valid receipt of payment for your subscription.', 50, currentY + 75, { lineGap: 3 })
         .text('2. Subscription benefits are immediately active and valid for 30 days.', 50, currentY + 88, { lineGap: 3 })
         .text('3. For any billing support queries, please reach out to support@kwickbot.in.', 50, currentY + 101, { lineGap: 3 });

      // Bottom Centered Footer
      doc.fillColor(lightSlate)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('Thank you for choosing Kwickbot!', 50, 720, { align: 'center' });

      doc.fontSize(8)
         .font('Helvetica')
         .text('Automating E-commerce Support & Conversational Recovery', 50, 735, { align: 'center', color: '#94a3b8' });

      doc.end();

      writeStream.on('finish', () => {
        resolve(filePath);
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateInvoicePDF
};
