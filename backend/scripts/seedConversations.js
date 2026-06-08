const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
require('dotenv').config();

async function seedConversations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const testConversations = [
      {
        customerPhone: '+1234567890',
        customerName: 'John Smith',
        customerEmail: 'john@example.com',
        status: 'active',
        escalated: false,
        messages: [
          {
            role: 'user',
            content: 'Hi, I need help with my order',
            timestamp: new Date(Date.now() - 3600000), // 1 hour ago
            intent: 'order_status'
          },
          {
            role: 'assistant',
            content: 'Hello! I\'d be happy to help you with your order. Could you please provide your order number?',
            timestamp: new Date(Date.now() - 3590000),
            intent: 'order_status'
          },
          {
            role: 'user',
            content: 'My order number is ORD-12345',
            timestamp: new Date(Date.now() - 3580000),
            intent: 'order_status'
          },
          {
            role: 'assistant',
            content: 'Let me check that for you... Your order ORD-12345 is currently being processed and will be shipped within 24 hours.',
            timestamp: new Date(Date.now() - 3570000),
            intent: 'order_status'
          }
        ],
        lastMessageAt: new Date(Date.now() - 3570000)
      },
      {
        customerPhone: '+1234567891',
        customerName: 'Sarah Johnson',
        customerEmail: 'sarah@example.com',
        status: 'active',
        escalated: true,
        escalationReason: 'refund_request',
        messages: [
          {
            role: 'user',
            content: 'I want to return my product and get a refund',
            timestamp: new Date(Date.now() - 7200000), // 2 hours ago
            intent: 'refund_request'
          },
          {
            role: 'assistant',
            content: 'I understand you\'d like to return your product. Let me connect you with our support team who can help process your refund.',
            timestamp: new Date(Date.now() - 7190000),
            intent: 'refund_request'
          },
          {
            role: 'user',
            content: 'How long will this take?',
            timestamp: new Date(Date.now() - 7180000),
            intent: 'refund_request'
          }
        ],
        lastMessageAt: new Date(Date.now() - 7180000)
      },
      {
        customerPhone: '+1234567892',
        customerName: 'Mike Davis',
        customerEmail: 'mike@example.com',
        status: 'resolved',
        escalated: false,
        messages: [
          {
            role: 'user',
            content: 'What are your business hours?',
            timestamp: new Date(Date.now() - 86400000), // 1 day ago
            intent: 'general_inquiry'
          },
          {
            role: 'assistant',
            content: 'We\'re available 24/7 through this AI assistant! For phone support, our team is available Monday-Friday, 9 AM - 6 PM EST.',
            timestamp: new Date(Date.now() - 86390000),
            intent: 'general_inquiry'
          },
          {
            role: 'user',
            content: 'Perfect, thank you!',
            timestamp: new Date(Date.now() - 86380000),
            intent: 'general_inquiry'
          }
        ],
        lastMessageAt: new Date(Date.now() - 86380000),
        resolvedAt: new Date(Date.now() - 86380000)
      },
      {
        customerPhone: '+1234567893',
        customerName: 'Emily Chen',
        customerEmail: 'emily@example.com',
        status: 'active',
        escalated: false,
        messages: [
          {
            role: 'user',
            content: 'Do you ship internationally?',
            timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
            intent: 'general_inquiry'
          },
          {
            role: 'assistant',
            content: 'Yes! We ship to over 50 countries worldwide. Shipping costs and delivery times vary by location. Where would you like us to ship to?',
            timestamp: new Date(Date.now() - 1790000),
            intent: 'general_inquiry'
          }
        ],
        lastMessageAt: new Date(Date.now() - 1790000)
      },
      {
        customerPhone: '+1234567894',
        customerName: 'David Wilson',
        customerEmail: 'david@example.com',
        status: 'active',
        escalated: false,
        messages: [
          {
            role: 'user',
            content: 'I received a damaged product',
            timestamp: new Date(Date.now() - 900000), // 15 minutes ago
            intent: 'complaint'
          },
          {
            role: 'assistant',
            content: 'I\'m sorry to hear that! We\'ll make this right. Could you please send me a photo of the damaged item and your order number?',
            timestamp: new Date(Date.now() - 890000),
            intent: 'complaint'
          },
          {
            role: 'user',
            content: 'Order number is ORD-67890',
            timestamp: new Date(Date.now() - 880000),
            intent: 'complaint'
          }
        ],
        lastMessageAt: new Date(Date.now() - 880000)
      }
    ];

    // Clear existing test conversations (except the real one)
    await Conversation.deleteMany({ 
      customerPhone: { $in: testConversations.map(c => c.customerPhone) }
    });

    // Insert test conversations
    await Conversation.insertMany(testConversations);

    console.log('✅ Test conversations created successfully!');
    console.log('='.repeat(60));
    console.log(`📊 Created ${testConversations.length} test conversations`);
    console.log('\n📋 Test Conversations:');
    testConversations.forEach((conv, index) => {
      console.log(`${index + 1}. ${conv.customerName} (${conv.customerPhone})`);
      console.log(`   Status: ${conv.status} | Messages: ${conv.messages.length}`);
    });
    
    console.log('\n💡 You can now view these in the Live Chat page!');
    console.log('   Go to: http://localhost:3000/dashboard/live-chat');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedConversations();
