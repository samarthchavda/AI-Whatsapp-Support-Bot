const mongoose = require('mongoose');
const Order = require('../models/Order');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const ReturnPolicy = require('../models/ReturnPolicy');
const PaymentPolicy = require('../models/PaymentPolicy');
require('dotenv').config();

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Order.deleteMany({});
    await Invoice.deleteMany({});
    await Customer.deleteMany({});
    await ReturnPolicy.deleteMany({});
    await PaymentPolicy.deleteMany({});
    
    console.log('🗑️  Cleared existing data');

    // Create sample customers
    const customers = [
      {
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john.doe@example.com',
        totalOrders: 0,
        totalSpent: 0
      },
      {
        name: 'Jane Smith',
        phone: '+1234567891',
        email: 'jane.smith@example.com',
        totalOrders: 0,
        totalSpent: 0
      },
      {
        name: 'Bob Johnson',
        phone: '+1234567892',
        email: 'bob.johnson@example.com',
        totalOrders: 0,
        totalSpent: 0
      }
    ];

    const createdCustomers = await Customer.insertMany(customers);
    console.log(`✅ Created ${createdCustomers.length} customers`);

    // Create sample orders
    const orders = [
      {
        orderId: 'ORD-001',
        customerId: createdCustomers[0]._id,
        customerPhone: createdCustomers[0].phone,
        customerName: createdCustomers[0].name,
        items: [
          {
            productId: 'PROD-001',
            productName: 'Wireless Headphones',
            quantity: 1,
            price: 99.99
          }
        ],
        totalAmount: 99.99,
        status: 'delivered',
        paymentStatus: 'completed',
        orderDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        estimatedDelivery: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        deliveredDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        trackingNumber: 'TRK123456789',
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        }
      },
      {
        orderId: 'ORD-002',
        customerId: createdCustomers[0]._id,
        customerPhone: createdCustomers[0].phone,
        customerName: createdCustomers[0].name,
        items: [
          {
            productId: 'PROD-002',
            productName: 'Smart Watch',
            quantity: 1,
            price: 299.99
          }
        ],
        totalAmount: 299.99,
        status: 'shipped',
        paymentStatus: 'completed',
        orderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        trackingNumber: 'TRK987654321',
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        }
      },
      {
        orderId: 'ORD-003',
        customerId: createdCustomers[1]._id,
        customerPhone: createdCustomers[1].phone,
        customerName: createdCustomers[1].name,
        items: [
          {
            productId: 'PROD-003',
            productName: 'Laptop Stand',
            quantity: 2,
            price: 49.99
          }
        ],
        totalAmount: 99.98,
        status: 'processing',
        paymentStatus: 'completed',
        orderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        shippingAddress: {
          street: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90001',
          country: 'USA'
        }
      },
      {
        orderId: 'ORD-004',
        customerId: createdCustomers[1]._id,
        customerPhone: createdCustomers[1].phone,
        customerName: createdCustomers[1].name,
        items: [
          {
            productId: 'PROD-004',
            productName: 'USB-C Cable',
            quantity: 3,
            price: 19.99
          }
        ],
        totalAmount: 59.97,
        status: 'pending',
        paymentStatus: 'completed',
        orderDate: new Date(),
        estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        shippingAddress: {
          street: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90001',
          country: 'USA'
        }
      },
      {
        orderId: 'ORD-005',
        customerId: createdCustomers[2]._id,
        customerPhone: createdCustomers[2].phone,
        customerName: createdCustomers[2].name,
        items: [
          {
            productId: 'PROD-005',
            productName: 'Mechanical Keyboard',
            quantity: 1,
            price: 149.99
          }
        ],
        totalAmount: 149.99,
        status: 'shipped',
        paymentStatus: 'completed',
        orderDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        estimatedDelivery: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        trackingNumber: 'TRK555666777',
        shippingAddress: {
          street: '789 Pine Rd',
          city: 'Chicago',
          state: 'IL',
          zipCode: '60601',
          country: 'USA'
        }
      },
      {
        orderId: 'ORD-006',
        customerId: createdCustomers[0]._id,
        customerPhone: createdCustomers[0].phone,
        customerName: createdCustomers[0].name,
        items: [
          {
            productId: 'PROD-006',
            productName: 'Wireless Mouse',
            quantity: 1,
            price: 45.99
          }
        ],
        totalAmount: 45.99,
        status: 'pending',
        paymentStatus: 'completed',
        orderDate: new Date(),
        estimatedDelivery: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        }
      },
      {
        orderId: 'ORD-007',
        customerId: createdCustomers[1]._id,
        customerPhone: createdCustomers[1].phone,
        customerName: createdCustomers[1].name,
        items: [
          {
            productId: 'PROD-007',
            productName: 'Phone Case',
            quantity: 2,
            price: 24.99
          }
        ],
        totalAmount: 49.98,
        status: 'pending',
        paymentStatus: 'completed',
        orderDate: new Date(),
        estimatedDelivery: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        shippingAddress: {
          street: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90001',
          country: 'USA'
        }
      },
      {
        orderId: 'ORD-008',
        customerId: createdCustomers[2]._id,
        customerPhone: createdCustomers[2].phone,
        customerName: createdCustomers[2].name,
        items: [
          {
            productId: 'PROD-008',
            productName: '4K Monitor',
            quantity: 1,
            price: 399.99
          }
        ],
        totalAmount: 399.99,
        status: 'pending',
        paymentStatus: 'completed',
        orderDate: new Date(),
        estimatedDelivery: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        shippingAddress: {
          street: '789 Pine Rd',
          city: 'Chicago',
          state: 'IL',
          zipCode: '60601',
          country: 'USA'
        }
      },
      {
        orderId: 'ORD-009',
        customerId: createdCustomers[0]._id,
        customerPhone: createdCustomers[0].phone,
        customerName: createdCustomers[0].name,
        items: [
          {
            productId: 'PROD-009',
            productName: 'Laptop Bag',
            quantity: 1,
            price: 79.99
          }
        ],
        totalAmount: 79.99,
        status: 'pending',
        paymentStatus: 'completed',
        orderDate: new Date(),
        estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        }
      },
      {
        orderId: 'ORD-010',
        customerId: createdCustomers[1]._id,
        customerPhone: createdCustomers[1].phone,
        customerName: createdCustomers[1].name,
        items: [
          {
            productId: 'PROD-010',
            productName: 'Webcam HD',
            quantity: 1,
            price: 89.99
          }
        ],
        totalAmount: 89.99,
        status: 'pending',
        paymentStatus: 'completed',
        orderDate: new Date(),
        estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        shippingAddress: {
          street: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90001',
          country: 'USA'
        }
      }
    ];

    const createdOrders = await Order.insertMany(orders);
    console.log(`✅ Created ${createdOrders.length} orders`);

    // Create sample invoices
    const invoices = [
      {
        invoiceNumber: 'INV-001',
        customerId: createdCustomers[0]._id,
        customerPhone: createdCustomers[0].phone,
        customerName: createdCustomers[0].name,
        customerEmail: createdCustomers[0].email,
        items: [
          {
            description: 'Wireless Headphones',
            quantity: 1,
            unitPrice: 99.99,
            amount: 99.99
          }
        ],
        subtotal: 99.99,
        taxAmount: 9.99,
        totalAmount: 109.98,
        status: 'paid',
        paymentStatus: 'completed',
        paymentTerms: 'Net 30',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        issuedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        paidDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        amountPaid: 109.98,
        billingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        }
      },
      {
        invoiceNumber: 'INV-002',
        customerId: createdCustomers[0]._id,
        customerPhone: createdCustomers[0].phone,
        customerName: createdCustomers[0].name,
        customerEmail: createdCustomers[0].email,
        items: [
          {
            description: 'Smart Watch',
            quantity: 1,
            unitPrice: 299.99,
            amount: 299.99
          }
        ],
        subtotal: 299.99,
        taxAmount: 30.00,
        totalAmount: 329.99,
        status: 'partially_paid',
        paymentStatus: 'partial',
        paymentTerms: 'Net 30',
        dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        issuedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        amountPaid: 165.00,
        billingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        }
      },
      {
        invoiceNumber: 'INV-003',
        customerId: createdCustomers[1]._id,
        customerPhone: createdCustomers[1].phone,
        customerName: createdCustomers[1].name,
        customerEmail: createdCustomers[1].email,
        items: [
          {
            description: 'Laptop Stand x2',
            quantity: 2,
            unitPrice: 49.99,
            amount: 99.98
          }
        ],
        subtotal: 99.98,
        taxAmount: 10.00,
        totalAmount: 109.98,
        status: 'issued',
        paymentStatus: 'pending',
        paymentTerms: 'Net 30',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        issuedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        amountPaid: 0,
        billingAddress: {
          street: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90001',
          country: 'USA'
        }
      },
      {
        invoiceNumber: 'INV-004',
        customerId: createdCustomers[1]._id,
        customerPhone: createdCustomers[1].phone,
        customerName: createdCustomers[1].name,
        customerEmail: createdCustomers[1].email,
        items: [
          {
            description: 'USB-C Cable x3',
            quantity: 3,
            unitPrice: 19.99,
            amount: 59.97
          }
        ],
        subtotal: 59.97,
        taxAmount: 6.00,
        totalAmount: 65.97,
        status: 'overdue',
        paymentStatus: 'pending',
        paymentTerms: 'Net 30',
        dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days overdue
        issuedDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        amountPaid: 0,
        billingAddress: {
          street: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90001',
          country: 'USA'
        }
      },
      {
        invoiceNumber: 'INV-005',
        customerId: createdCustomers[2]._id,
        customerPhone: createdCustomers[2].phone,
        customerName: createdCustomers[2].name,
        customerEmail: createdCustomers[2].email,
        items: [
          {
            description: 'Mechanical Keyboard',
            quantity: 1,
            unitPrice: 149.99,
            amount: 149.99
          }
        ],
        subtotal: 149.99,
        taxAmount: 15.00,
        totalAmount: 164.99,
        status: 'issued',
        paymentStatus: 'pending',
        paymentTerms: 'Net 45',
        dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        issuedDate: new Date(),
        amountPaid: 0,
        billingAddress: {
          street: '789 Pine Rd',
          city: 'Chicago',
          state: 'IL',
          zipCode: '60601',
          country: 'USA'
        }
      }
    ];

    const createdInvoices = await Invoice.insertMany(invoices);
    console.log(`✅ Created ${createdInvoices.length} invoices`);

    // Update customer stats
    for (const customer of createdCustomers) {
      const customerOrders = await Order.find({ customerId: customer._id });
      customer.totalOrders = customerOrders.length;
      customer.totalSpent = customerOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      customer.lastOrderDate = customerOrders[customerOrders.length - 1]?.orderDate;
      await customer.save();
    }
    console.log('✅ Updated customer statistics');

    // Create return policies
    const returnPolicies = [
      {
        title: 'General Return Policy',
        content: 'We offer a 30-day return policy for most items. Items must be unused, in original packaging, and with all tags attached. Refunds will be processed within 5-7 business days after we receive your return.',
        category: 'general',
        timeFrame: {
          value: 30,
          unit: 'days'
        },
        conditions: [
          'Item must be unused and in original condition',
          'Original packaging and tags must be intact',
          'Receipt or proof of purchase required',
          'Return shipping may be at customer expense'
        ],
        isActive: true,
        version: '1.0'
      },
      {
        title: 'Electronics Return Policy',
        content: 'Electronics can be returned within 14 days of purchase. All accessories, manuals, and original packaging must be included. Items must be in working condition with no physical damage.',
        category: 'electronics',
        timeFrame: {
          value: 14,
          unit: 'days'
        },
        conditions: [
          'All accessories and manuals must be included',
          'No physical damage or water damage',
          'Original packaging required',
          'Restocking fee may apply (15%)'
        ],
        isActive: true,
        version: '1.0'
      },
      {
        title: 'Clothing Return Policy',
        content: 'Clothing items can be returned within 45 days. Items must be unworn, unwashed, and have all original tags attached. Some final sale items cannot be returned.',
        category: 'clothing',
        timeFrame: {
          value: 45,
          unit: 'days'
        },
        conditions: [
          'Items must be unworn and unwashed',
          'All tags must be attached',
          'No signs of wear or alterations',
          'Final sale items are non-returnable'
        ],
        isActive: true,
        version: '1.0'
      }
    ];

    const createdPolicies = await ReturnPolicy.insertMany(returnPolicies);
    console.log(`✅ Created ${createdPolicies.length} return policies`);

    // Create payment policies
    const paymentPolicies = [
      {
        title: 'Bank Transfer Payment',
        content: 'We accept bank transfers for invoices above $500. Please include the invoice number as reference. Transfers typically clear within 2-3 business days.',
        paymentMethod: 'bank_transfer',
        paymentTerms: 'Net 30',
        lateFeePercentage: 1.5,
        gracePeriodDays: 5,
        acceptedCurrencies: ['USD', 'EUR', 'GBP'],
        isActive: true,
        version: '1.0'
      },
      {
        title: 'Credit Card Payment',
        content: 'We accept all major credit cards (Visa, MasterCard, American Express). Payment is processed immediately upon submission.',
        paymentMethod: 'credit_card',
        paymentTerms: 'Due on Receipt',
        lateFeePercentage: 2.0,
        gracePeriodDays: 0,
        acceptedCurrencies: ['USD', 'EUR', 'GBP', 'AUD'],
        isActive: true,
        version: '1.0'
      },
      {
        title: 'Check Payment',
        content: 'Checks should be made payable to our company and mailed to our office. Payment is recorded upon receipt and clearing.',
        paymentMethod: 'check',
        paymentTerms: 'Net 45',
        lateFeePercentage: 1.0,
        gracePeriodDays: 10,
        acceptedCurrencies: ['USD'],
        isActive: true,
        version: '1.0'
      }
    ];

    const createdPaymentPolicies = await PaymentPolicy.insertMany(paymentPolicies);
    console.log(`✅ Created ${createdPaymentPolicies.length} payment policies`);

    console.log('');
    console.log('🎉 Sample data seeded successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log(`   - ${createdCustomers.length} customers`);
    console.log(`   - ${createdOrders.length} orders`);
    console.log(`   - ${createdInvoices.length} invoices`);
    console.log(`   - ${createdPolicies.length} return policies`);
    console.log(`   - ${createdPaymentPolicies.length} payment policies`);
    console.log('');
    console.log('💡 You can now test the bot with these phone numbers:');
    createdCustomers.forEach(customer => {
      console.log(`   - ${customer.name}: ${customer.phone}`);
    });

    mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    mongoose.connection.close();
    process.exit(1);
  }
};

seedData();
