const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Counter = require('../models/Counter');
const { getNextOrderId } = require('../services/orderIdService');

// Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    
    let query = {};
    
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

    const orders = await Order.find(query)
      .sort({ orderDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Order.countDocuments(query);

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
    const order = await Order.findOne({ orderId: req.params.id });
    
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
    const orders = await Order.find({ customerPhone: req.params.phone })
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
        email: orderData.customerEmail
      });
      await customer.save();
    }

    let order = null;
    const maxRetries = 10;

    // Generate unique auto-increment order ID with retry guard.
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const nextOrderId = await getNextOrderId({
        CounterModel: Counter,
        OrderModel: Order
      });
      order = new Order({
        ...orderData,
        orderId: nextOrderId,
        customerId: customer._id
      });

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

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, trackingNumber, estimatedDelivery, notes } = req.body;

    const order = await Order.findOne({ orderId: req.params.id });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (status) order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (estimatedDelivery) order.estimatedDelivery = estimatedDelivery;
    if (typeof notes === 'string') order.notes = notes;

    if (status === 'delivered') {
      order.deliveredDate = new Date();
    }

    if (status === 'return_processing') {
      order.returnRequestedDate = new Date();
    }

    if (status === 'returned') {
      order.returnedDate = new Date();
    }

    await order.save();

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete order
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findOneAndDelete({ orderId: req.params.id });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
