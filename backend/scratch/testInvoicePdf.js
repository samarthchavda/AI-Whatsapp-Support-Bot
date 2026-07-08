const path = require('path');
const fs = require('fs');
const { generateInvoicePDF } = require('../services/invoicePdfService');

async function test() {
  console.log('🧪 Testing PDF Invoice Generation...');
  
  const mockAdmin = {
    _id: '603d2b2f64ab512f458129e1',
    name: 'Samarth Chavda',
    businessName: 'Samarth E-commerce Store',
    email: 'samarthchavda132@gmail.com',
    customDiscount: 15 // 15% discount
  };

  const mockInvoice = {
    invoiceNumber: 'INV-TEST-999',
    createdAt: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    paymentStatus: 'completed',
    customerName: 'Samarth Chavda',
    customerPhone: '+918128420287',
    customerEmail: 'samarthchavda132@gmail.com',
    subtotal: 2999,
    totalAmount: 2549.15, // after 15% discount
    items: [
      {
        description: 'Kwickbot PROFESSIONAL Plan Subscription',
        quantity: 1,
        unitPrice: 2999,
        amount: 2999
      }
    ]
  };

  try {
    const pdfPath = await generateInvoicePDF(mockInvoice, mockAdmin);
    console.log(`✅ Success! PDF Invoice generated successfully.`);
    console.log(`📂 Location: ${pdfPath}`);
    console.log(`📏 File Size: ${fs.statSync(pdfPath).size} bytes`);
  } catch (error) {
    console.error('❌ Error generating test PDF:', error);
  }
}

test();
