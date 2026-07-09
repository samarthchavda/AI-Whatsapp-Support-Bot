/**
 * Seeds rich demo data for demo@store.com (business admin dashboard).
 * Safe to re-run — only clears data belonging to that admin.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Conversation = require('../models/Conversation');
const Escalation = require('../models/Escalation');
const AILog = require('../models/AILog');
const Counter = require('../models/Counter');

const DEMO_EMAIL = 'demo@store.com';

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const hoursAgo = (n) => new Date(Date.now() - n * 60 * 60 * 1000);
const minsAgo = (n) => new Date(Date.now() - n * 60 * 1000);

async function seedDemoAccount() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    let admin = await Admin.findOne({ email: DEMO_EMAIL });
    if (!admin) {
      admin = new Admin({
        email: DEMO_EMAIL,
        password: 'Demo@123',
        name: 'Demo Store',
        role: 'admin',
        businessName: 'Demo E-Commerce',
        subscriptionPlan: 'professional',
        subscriptionStatus: 'active',
        monthlyPrice: 79,
        geminiTokensLimit: 50000,
        geminiTokensUsed: 12450,
        totalMessagesProcessed: 342,
        whatsappConnected: false,
        whatsappConnectedAt: null
      });
      await admin.save();
      console.log(`✅ Created admin: ${DEMO_EMAIL}`);
    } else {
      console.log(`📌 Using existing admin: ${DEMO_EMAIL}`);
    }

    const adminId = admin._id;

    // Clear only this tenant's data
    const oldConvIds = (await Conversation.find({ admin: adminId }).select('_id')).map((c) => c._id);
    if (oldConvIds.length) {
      await AILog.deleteMany({ conversationId: { $in: oldConvIds } });
    }
    await Order.deleteMany({ admin: adminId });
    await Conversation.deleteMany({ admin: adminId });
    await Escalation.deleteMany({ admin: adminId });
    await Customer.deleteMany({ admin: adminId });
    console.log('🗑️  Cleared previous demo tenant data');

    const customers = await Customer.insertMany([
      { name: 'Priya Sharma', phone: '+919876543210', email: 'priya@email.com', totalOrders: 3, totalSpent: 8497, admin: adminId },
      { name: 'Rahul Mehta', phone: '+919876543211', email: 'rahul@email.com', totalOrders: 2, totalSpent: 4298, admin: adminId },
      { name: 'Ananya Patel', phone: '+919876543212', email: 'ananya@email.com', totalOrders: 1, totalSpent: 1999, admin: adminId },
      { name: 'Vikram Singh', phone: '+919876543213', email: 'vikram@email.com', totalOrders: 2, totalSpent: 5498, admin: adminId },
      { name: 'Sneha Reddy', phone: '+919876543214', email: 'sneha@email.com', totalOrders: 1, totalSpent: 1299, admin: adminId }
    ]);
    console.log(`✅ Created ${customers.length} customers`);

    const orders = await Order.insertMany([
      {
        orderId: 'ORD-1001', admin: adminId, customerId: customers[0]._id,
        customerPhone: customers[0].phone, customerName: customers[0].name,
        items: [{ productName: 'Wireless Earbuds Pro', quantity: 1, price: 2999 }],
        totalAmount: 2999, status: 'delivered', paymentStatus: 'completed',
        orderDate: daysAgo(12), trackingNumber: 'TRK-IND-88421',
        shippingAddress: { city: 'Mumbai', state: 'MH', country: 'India' }
      },
      {
        orderId: 'ORD-1002', admin: adminId, customerId: customers[0]._id,
        customerPhone: customers[0].phone, customerName: customers[0].name,
        items: [{ productName: 'Smart Watch Series 5', quantity: 1, price: 5499 }],
        totalAmount: 5499, status: 'shipped', paymentStatus: 'completed',
        orderDate: daysAgo(5), trackingNumber: 'TRK-IND-99234',
        shippingAddress: { city: 'Mumbai', state: 'MH', country: 'India' }
      },
      {
        orderId: 'ORD-1003', admin: adminId, customerId: customers[1]._id,
        customerPhone: customers[1].phone, customerName: customers[1].name,
        items: [{ productName: 'Laptop Stand Aluminium', quantity: 1, price: 1299 }],
        totalAmount: 1299, status: 'processing', paymentStatus: 'completed',
        orderDate: daysAgo(2),
        shippingAddress: { city: 'Delhi', state: 'DL', country: 'India' }
      },
      {
        orderId: 'ORD-1004', admin: adminId, customerId: customers[2]._id,
        customerPhone: customers[2].phone, customerName: customers[2].name,
        items: [{ productName: 'USB-C Hub 7-in-1', quantity: 2, price: 999 }],
        totalAmount: 1998, status: 'pending', paymentStatus: 'pending',
        orderDate: daysAgo(1),
        shippingAddress: { city: 'Ahmedabad', state: 'GJ', country: 'India' }
      },
      {
        orderId: 'ORD-1005', admin: adminId, customerId: customers[3]._id,
        customerPhone: customers[3].phone, customerName: customers[3].name,
        items: [{ productName: 'Mechanical Keyboard RGB', quantity: 1, price: 4499 }],
        totalAmount: 4499, status: 'return_processing', paymentStatus: 'completed',
        orderDate: daysAgo(8),
        shippingAddress: { city: 'Bangalore', state: 'KA', country: 'India' }
      },
      {
        orderId: 'ORD-1006', admin: adminId, customerId: customers[4]._id,
        customerPhone: customers[4].phone, customerName: customers[4].name,
        items: [{ productName: 'Phone Case Premium', quantity: 1, price: 1299 }],
        totalAmount: 1299, status: 'delivered', paymentStatus: 'completed',
        orderDate: daysAgo(15),
        shippingAddress: { city: 'Hyderabad', state: 'TS', country: 'India' }
      },
      {
        orderId: 'ORD-1007', admin: adminId, customerId: customers[1]._id,
        customerPhone: customers[1].phone, customerName: customers[1].name,
        items: [{ productName: 'Bluetooth Speaker', quantity: 1, price: 2999 }],
        totalAmount: 2999, status: 'shipped', paymentStatus: 'completed',
        orderDate: daysAgo(3), trackingNumber: 'TRK-IND-77102',
        shippingAddress: { city: 'Delhi', state: 'DL', country: 'India' }
      },
      {
        orderId: 'ORD-1008', admin: adminId, customerId: customers[3]._id,
        customerPhone: customers[3].phone, customerName: customers[3].name,
        items: [{ productName: 'Gaming Mouse', quantity: 1, price: 1999 }],
        totalAmount: 1999, status: 'cancelled', paymentStatus: 'refunded',
        orderDate: daysAgo(20),
        shippingAddress: { city: 'Bangalore', state: 'KA', country: 'India' }
      }
    ]);
    console.log(`✅ Created ${orders.length} orders`);

    const conversations = await Conversation.insertMany([
      {
        admin: adminId, customerPhone: customers[0].phone, customerName: customers[0].name,
        status: 'active', escalated: false, satisfaction: null,
        relatedOrderIds: ['ORD-1002'],
        messages: [
          { role: 'user', content: 'Hi, where is my smart watch order?', timestamp: minsAgo(45), intent: 'order_status' },
          { role: 'assistant', content: 'Your order ORD-1002 (Smart Watch Series 5) is shipped! Tracking: TRK-IND-99234. ETA: 2 days. 📦', timestamp: minsAgo(44), intent: 'order_status' },
          { role: 'user', content: 'Great, thanks!', timestamp: minsAgo(40), intent: 'general_inquiry' }
        ],
        createdAt: daysAgo(0), updatedAt: minsAgo(40)
      },
      {
        admin: adminId, customerPhone: customers[1].phone, customerName: customers[1].name,
        status: 'escalated', escalated: true, escalationReason: 'refund_request',
        escalatedAt: hoursAgo(2), relatedOrderIds: ['ORD-1003'],
        messages: [
          { role: 'user', content: 'I want a refund — laptop stand doesn\'t fit my desk', timestamp: hoursAgo(3), intent: 'refund_request' },
          { role: 'assistant', content: 'Sorry to hear that! I\'m connecting you with our team for a refund on ORD-1003.', timestamp: hoursAgo(2.9), intent: 'refund_request' },
          { role: 'user', content: 'Please hurry, I need the money back', timestamp: hoursAgo(2), intent: 'refund_request' }
        ],
        createdAt: daysAgo(1), updatedAt: hoursAgo(2)
      },
      {
        admin: adminId, customerPhone: customers[3].phone, customerName: customers[3].name,
        status: 'escalated', escalated: true, escalationReason: 'complaint',
        escalatedAt: hoursAgo(1), relatedOrderIds: ['ORD-1005'],
        messages: [
          { role: 'user', content: 'URGENT! Keyboard arrived damaged!', timestamp: hoursAgo(2), intent: 'complaint' },
          { role: 'assistant', content: 'I\'m very sorry! Escalating to our support team for immediate replacement.', timestamp: hoursAgo(1.9), intent: 'complaint' },
          { role: 'user', content: 'I need it for work tomorrow', timestamp: hoursAgo(1), intent: 'complaint' }
        ],
        createdAt: daysAgo(0), updatedAt: hoursAgo(1)
      },
      {
        admin: adminId, customerPhone: customers[2].phone, customerName: customers[2].name,
        status: 'resolved', escalated: false, satisfaction: 5, resolvedAt: daysAgo(2),
        messages: [
          { role: 'user', content: 'What\'s your return policy?', timestamp: daysAgo(3), intent: 'return_policy' },
          { role: 'assistant', content: '30-day returns on unused items in original packaging. Refunds in 5-7 business days. ✅', timestamp: daysAgo(3), intent: 'return_policy' }
        ],
        createdAt: daysAgo(3), updatedAt: daysAgo(2)
      },
      {
        admin: adminId, customerPhone: customers[4].phone, customerName: customers[4].name,
        status: 'resolved', escalated: false, satisfaction: 4, resolvedAt: daysAgo(1),
        relatedOrderIds: ['ORD-1006'],
        messages: [
          { role: 'user', content: 'Check order ORD-1006', timestamp: daysAgo(2), intent: 'order_status' },
          { role: 'assistant', content: 'Order ORD-1006 (Phone Case Premium) was delivered 2 days ago. Hope you love it! 🎉', timestamp: daysAgo(2), intent: 'order_status' }
        ],
        createdAt: daysAgo(2), updatedAt: daysAgo(1)
      },
      {
        admin: adminId, customerPhone: customers[0].phone, customerName: customers[0].name,
        status: 'resolved', escalated: false, satisfaction: 5, resolvedAt: daysAgo(5),
        relatedOrderIds: ['ORD-1001'],
        messages: [
          { role: 'user', content: 'Order ORD-1001 status?', timestamp: daysAgo(6), intent: 'order_status' },
          { role: 'assistant', content: 'ORD-1001 (Wireless Earbuds Pro) was delivered successfully!', timestamp: daysAgo(6), intent: 'order_status' }
        ],
        createdAt: daysAgo(6), updatedAt: daysAgo(5)
      },
      {
        admin: adminId, customerPhone: customers[1].phone, customerName: customers[1].name,
        status: 'active', escalated: false,
        messages: [
          { role: 'user', content: 'Do you ship to Pune?', timestamp: minsAgo(20), intent: 'general_inquiry' },
          { role: 'assistant', content: 'Yes! We ship across India including Pune. Delivery in 3-5 business days. 🚚', timestamp: minsAgo(19), intent: 'general_inquiry' }
        ],
        createdAt: daysAgo(0), updatedAt: minsAgo(19)
      },
      // Spread across week for analytics chart
      {
        admin: adminId, customerPhone: '+919876543299', customerName: 'Amit Kumar',
        status: 'resolved', escalated: false, satisfaction: 4, resolvedAt: daysAgo(6),
        messages: [
          { role: 'user', content: 'Hello', timestamp: daysAgo(6), intent: 'general_inquiry' },
          { role: 'assistant', content: 'Hi! How can I help you today?', timestamp: daysAgo(6), intent: 'general_inquiry' }
        ],
        createdAt: daysAgo(6), updatedAt: daysAgo(6)
      },
      {
        admin: adminId, customerPhone: '+919876543298', customerName: 'Kavya Nair',
        status: 'resolved', escalated: false, satisfaction: 5, resolvedAt: daysAgo(5),
        messages: [
          { role: 'user', content: 'Shipping time?', timestamp: daysAgo(5), intent: 'general_inquiry' },
          { role: 'assistant', content: 'Standard shipping: 3-5 days. Express: 1-2 days.', timestamp: daysAgo(5), intent: 'general_inquiry' }
        ],
        createdAt: daysAgo(5), updatedAt: daysAgo(5)
      },
      {
        admin: adminId, customerPhone: '+919876543297', customerName: 'Rohan Gupta',
        status: 'resolved', escalated: false, resolvedAt: daysAgo(4),
        messages: [
          { role: 'user', content: 'Cancel my order', timestamp: daysAgo(4), intent: 'cancel_order' },
          { role: 'assistant', content: 'Please share your order ID to cancel.', timestamp: daysAgo(4), intent: 'cancel_order' }
        ],
        createdAt: daysAgo(4), updatedAt: daysAgo(4)
      },
      {
        admin: adminId, customerPhone: '+919876543296', customerName: 'Divya Iyer',
        status: 'resolved', escalated: false, resolvedAt: daysAgo(3),
        messages: [
          { role: 'user', content: 'Payment methods?', timestamp: daysAgo(3), intent: 'general_inquiry' },
          { role: 'assistant', content: 'We accept UPI, cards, net banking, and COD.', timestamp: daysAgo(3), intent: 'general_inquiry' }
        ],
        createdAt: daysAgo(3), updatedAt: daysAgo(3)
      },
      {
        admin: adminId, customerPhone: '+919876543295', customerName: 'Arjun Desai',
        status: 'active', escalated: false,
        messages: [
          { role: 'user', content: 'Any discounts available?', timestamp: daysAgo(2), intent: 'general_inquiry' },
          { role: 'assistant', content: 'Use code SAVE10 for 10% off your next order!', timestamp: daysAgo(2), intent: 'general_inquiry' }
        ],
        createdAt: daysAgo(2), updatedAt: daysAgo(2)
      }
    ]);
    console.log(`✅ Created ${conversations.length} conversations`);

    const escalations = await Escalation.insertMany([
      {
        admin: adminId,
        conversationId: conversations[2]._id,
        customerPhone: customers[3].phone,
        customerName: customers[3].name,
        reason: 'complaint',
        priority: 'urgent',
        description: 'Damaged mechanical keyboard on ORD-1005. Customer needs replacement urgently.',
        status: 'in_progress',
        assignedTo: 'Support Team',
        relatedOrderIds: ['ORD-1005'],
        notificationSent: true,
        notificationMethod: 'both'
      },
      {
        admin: adminId,
        conversationId: conversations[1]._id,
        customerPhone: customers[1].phone,
        customerName: customers[1].name,
        reason: 'refund_request',
        priority: 'high',
        description: 'Refund request for laptop stand ORD-1003 — item does not fit customer desk.',
        status: 'pending',
        relatedOrderIds: ['ORD-1003'],
        notificationSent: true,
        notificationMethod: 'email'
      }
    ]);
    console.log(`✅ Created ${escalations.length} escalations`);

    await Counter.findOneAndUpdate(
      { _id: 'order_id' },
      { $set: { seq: 1008 } },
      { upsert: true }
    );

    admin.geminiTokensUsed = 12450;
    admin.totalMessagesProcessed = 342;
    admin.whatsappConnected = true;
    await admin.save();

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Demo account seeded successfully!');
    console.log('='.repeat(60));
    console.log(`Email:    ${DEMO_EMAIL}`);
    console.log(`Password: Demo@123`);
    console.log(`Orders:   ${orders.length} | Conversations: ${conversations.length} | Escalations: ${escalations.length}`);
    console.log('Dashboard: http://localhost:3000/dashboard');
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seedDemoAccount();
