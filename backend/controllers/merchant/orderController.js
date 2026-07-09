const Order = require('../../models/Order');
const Customer = require('../../models/Customer');
const Counter = require('../../models/Counter');
const { getNextOrderId } = require('../../services/orderIdService');

// Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    
    let query = { admin: req.admin._id };
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { orderId: new RegExp(search, 'i') },
        { customerName: new RegExp(search, 'i') },
        { customerPhone: new RegExp(search, 'i') }
      ];
    }

    const [orders, count] = await Promise.all([
      Order.find(query)
        .sort({ orderDate: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean()
        .exec(),
      Order.countDocuments(query)
    ]);

    res.json({
      orders,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ 
      orderId: req.params.id,
      admin: req.admin._id 
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get orders by customer phone
exports.getOrdersByPhone = async (req, res) => {
  try {
    const orders = await Order.find({ 
      customerPhone: req.params.phone,
      admin: req.admin._id 
    })
      .sort({ orderDate: -1 });

    res.json({ orders, count: orders.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new order (for testing/demo)
exports.createOrder = async (req, res) => {
  try {
    const orderData = req.body;

    const normalizedPhone = (orderData.customerPhone || '')
      .replace(/\s+/g, '')
      .replace(/[^\d+]/g, '');
    orderData.customerPhone = normalizedPhone;

    // Find or create customer
    let customer = await Customer.findOne({ phone: orderData.customerPhone });
    
    if (!customer) {
      customer = new Customer({
        name: orderData.customerName,
        phone: orderData.customerPhone,
        email: orderData.customerEmail,
        admin: req.admin._id
      });
      await customer.save();
    }

    let order = null;
    const maxRetries = 10;

    // Generate unique auto-increment order ID with retry guard.
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const nextOrderId = await getNextOrderId({
        CounterModel: Counter,
        OrderModel: Order,
        adminId: req.admin._id
      });
      
      // Add admin info if authenticated
      const orderPayload = {
        ...orderData,
        orderId: nextOrderId,
        customerId: customer._id,
        customerEmail: orderData.customerEmail || customer.email,
        admin: req.admin._id,
        items: [{
          productName: orderData.productName,
          quantity: parseInt(orderData.quantity) || 1,
          price: parseFloat(orderData.totalAmount) || 0
        }]
      };

      if (req.admin) {
        orderPayload.createdBy = req.admin._id;
        orderPayload.createdByName = req.admin.name;
      }

      // Add CSV file info if uploaded
      if (req.file) {
        orderPayload.csvFile = {
          filename: req.file.filename,
          path: req.file.path,
          uploadedAt: new Date()
        };
      }

      order = new Order(orderPayload);

      try {
        await order.save();
        break;
      } catch (error) {
        if (error.code === 11000 && error.keyPattern && error.keyPattern.orderId) {
          order = null;
          continue;
        }
        throw error;
      }
    }

    if (!order) {
      throw new Error('Could not generate a unique order ID. Please try again.');
    }

    // Update customer stats
    customer.totalOrders += 1;
    customer.totalSpent += orderData.totalAmount;
    customer.lastOrderDate = new Date();
    await customer.save();

    // Trigger WhatsApp notification for order creation
    try {
      const webhookService = require('../../services/webhookService');
      console.log(`📡 Sending manual order confirmation WhatsApp notification to ${order.customerPhone}...`);
      await webhookService.sendOrderConfirmation(order, customer);
    } catch (wsError) {
      console.error('⚠️ Failed to send order confirmation WhatsApp notification:', wsError.message);
    }

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, trackingNumber, estimatedDelivery, notes } = req.body;

    const order = await Order.findOne({ 
      orderId: req.params.id,
      admin: req.admin._id 
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const oldStatus = order.status;

    if (status) order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (estimatedDelivery) order.estimatedDelivery = estimatedDelivery;
    if (typeof notes === 'string') order.notes = notes;

    if (status === 'delivered' && oldStatus !== 'delivered') {
      order.deliveredDate = new Date();
    }

    if (status === 'return_processing') {
      order.returnRequestedDate = new Date();
    }

    if (status === 'returned') {
      order.returnedDate = new Date();
    }

    await order.save();

    // Trigger WhatsApp notification for shipped/delivered status changes
    if (status && status !== oldStatus && (status === 'shipped' || status === 'delivered')) {
      try {
        const Customer = require('../../models/Customer');
        const customer = await Customer.findById(order.customerId);
        if (customer) {
          const webhookService = require('../../services/webhookService');
          console.log(`📱 Sending manual order status update WhatsApp notification to ${order.customerPhone}...`);
          await webhookService.sendTrackingUpdate(order, customer, {
            trackingNumber: order.trackingNumber,
            status: order.status
          });
        }
      } catch (err) {
        console.error('⚠️ Failed to send manual status update WhatsApp notification:', err.message);
      }
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete order
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findOneAndDelete({ 
      orderId: req.params.id,
      admin: req.admin._id 
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Bulk upload orders from CSV
exports.bulkUploadOrders = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No CSV file uploaded'
      });
    }

    const fs = require('fs');
    const csv = require('csv-parser');
    const results = [];
    const errors = [];

    // Read and parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    if (results.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'CSV file is empty'
      });
    }

    let successCount = 0;
    let failedCount = 0;

    // Process each row
    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      
      try {
        // Resolve headers with fallback support for Shopify export CSV format
        const csvOrderId = row.orderId || row.orderNumber || row.order_id || row.id || row.order_number || row.Name || row.Id;
        const rawPhone = row.customerPhone || row.customer_phone || row.Phone || row['Billing Phone'] || row['Shipping Phone'] || row.phone;
        const customerName = row.customerName || row.customer_name || row['Billing Name'] || row['Shipping Name'] || 'Customer';
        const productName = row.productName || row.product_name || row['Lineitem name'] || 'Product';
        const quantity = row.quantity || row.qty || row['Lineitem quantity'] || 1;
        const totalAmount = row.totalAmount || row.amount || row.Total || row.total || 0;
        
        let status = (row.status || row['Fulfillment Status'] || 'pending').toString().trim().toLowerCase();
        if (status === 'fulfilled') {
          status = 'delivered';
        } else if (status === 'unfulfilled') {
          status = 'pending';
        }

        let existingOrder = null;
        if (csvOrderId) {
          existingOrder = await Order.findOne({
            admin: req.admin._id,
            $or: [
              { orderId: csvOrderId.toString().trim() },
              { externalOrderId: csvOrderId.toString().trim() }
            ]
          });
        }

        if (existingOrder) {
          // Update status and tracking of existing order (shipped, delivered, etc.)
          if (status) {
            existingOrder.status = status;
            if (status === 'delivered' && !existingOrder.deliveredDate) {
              existingOrder.deliveredDate = new Date();
            }
          }
          if (row.trackingNumber) existingOrder.trackingNumber = row.trackingNumber.trim();
          if (row.carrier) existingOrder.carrier = row.carrier.trim();
          if (row.trackingUrl) existingOrder.trackingUrl = row.trackingUrl.trim();
          
          // Shopify multi-item orders format: append subsequent lineitems to the existing order
          const lineItemName = row['Lineitem name'] || row.productName || row.product_name;
          if (lineItemName) {
            const itemExists = existingOrder.items.some(item => item.productName === lineItemName.trim());
            if (!itemExists) {
              const itemQty = parseInt(row['Lineitem quantity'] || row.quantity || 1);
              const itemPrice = parseFloat(row['Lineitem price'] || row.price || 0);
              existingOrder.items.push({
                productName: lineItemName.trim(),
                quantity: itemQty,
                price: itemPrice
              });
            }
          }

          await existingOrder.save();
          successCount++;
          continue;
        }

        // Validate required fields for NEW orders (using resolved values)
        if (!customerName || !rawPhone || !productName || !quantity) {
          errors.push({
            row: i + 2, // +2 because CSV is 1-indexed and has header
            error: 'Missing required fields for new order creation (name, phone, product name, quantity)',
            data: row
          });
          failedCount++;
          continue;
        }

        // Normalize phone number
        const normalizedPhone = rawPhone
          .toString()
          .replace(/\s+/g, '')
          .replace(/[^\d+]/g, '');

        if (!normalizedPhone || normalizedPhone.length < 6) {
          errors.push({
            row: i + 2,
            error: 'Invalid or missing customer phone number',
            data: row
          });
          failedCount++;
          continue;
        }

        // Find or create customer
        let customer = await Customer.findOne({ phone: normalizedPhone });
        
        if (!customer) {
          customer = new Customer({
            name: customerName.toString().trim(),
            phone: normalizedPhone,
            email: row.customerEmail || row.Email || '',
            admin: req.admin._id
          });
          await customer.save();
        }

        // Use CSV order ID if available, otherwise generate one
        let finalOrderId = csvOrderId ? csvOrderId.toString().trim() : null;
        if (!finalOrderId) {
          finalOrderId = await getNextOrderId({
            CounterModel: Counter,
            OrderModel: Order,
            adminId: req.admin._id
          });
        }

        // Create order
        const orderData = {
          orderId: finalOrderId,
          externalOrderId: csvOrderId ? csvOrderId.toString().trim() : undefined,
          customerId: customer._id,
          customerName: customerName.toString().trim(),
          customerPhone: normalizedPhone,
          customerEmail: row.customerEmail || row.Email || '',
          totalAmount: parseFloat(totalAmount) || 0,
          status: status || 'pending',
          trackingNumber: row.trackingNumber || null,
          admin: req.admin._id,
          items: [{
            productName: productName.toString().trim(),
            quantity: parseInt(quantity) || 1,
            price: parseFloat(row['Lineitem price'] || row.price || totalAmount || 0)
          }]
        };

        // Add admin info if authenticated
        if (req.admin) {
          orderData.createdBy = req.admin._id;
          orderData.createdByName = req.admin.name;
        }

        const order = new Order(orderData);
        await order.save();

        // Update customer stats
        customer.totalOrders += 1;
        customer.totalSpent += orderData.totalAmount;
        customer.lastOrderDate = new Date();
        await customer.save();

        successCount++;
      } catch (error) {
        errors.push({
          row: i + 2,
          error: error.message,
          data: row
        });
        failedCount++;
      }
    }

    // Delete uploaded file after processing
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `Bulk upload completed. Success: ${successCount}, Failed: ${failedCount}`,
      data: {
        successCount,
        failedCount,
        totalRows: results.length,
        errors: errors.length > 0 ? errors.slice(0, 10) : [] // Return first 10 errors
      }
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process CSV file',
      message: error.message
    });
  }
};
