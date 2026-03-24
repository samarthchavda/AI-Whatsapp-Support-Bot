import React, { useState, useEffect } from 'react';
import { getOrders, updateOrder, createOrder } from '../services/api';

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  });

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;

      const response = await getOrders(params);
      setOrders(response.data.orders);
      setError(null);
    } catch (err) {
      setError('Failed to load orders');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await updateOrder(orderId, { status: newStatus });
      fetchOrders();
      alert('Order status updated successfully');
    } catch (err) {
      alert('Failed to update order status');
      console.error('Error updating order:', err);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const orderData = {
      customerName: formData.get('customerName'),
      customerPhone: formData.get('customerPhone'),
      customerEmail: formData.get('customerEmail'),
      totalAmount: parseFloat(formData.get('totalAmount')),
      status: 'pending',
      items: [
        {
          productName: formData.get('productName'),
          quantity: parseInt(formData.get('quantity')),
          price: parseFloat(formData.get('totalAmount'))
        }
      ]
    };

    try {
      await createOrder(orderData);
      setShowCreateForm(false);
      fetchOrders();
      alert('Order created successfully');
      e.target.reset();
    } catch (err) {
      alert('Failed to create order');
      console.error('Error creating order:', err);
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading orders...
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">Orders</h1>
            <p className="page-subtitle">Manage and track all customer orders</p>
          </div>
          <button 
            className="btn-primary" 
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span style={{ fontSize: '18px' }}>{showCreateForm ? '✕' : '+'}</span>
            {showCreateForm ? 'Cancel' : 'Add Order'}
          </button>
        </div>
      </div>

      {/* Create Order Form */}
      {showCreateForm && (
        <div className="table-container" style={{ marginBottom: '28px' }}>
          <div className="table-header">
            <h2>Create New Order</h2>
          </div>
          <form onSubmit={handleCreateOrder} style={{ padding: '28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '20px' }}>
              <div className="filter-group">
                <label>Customer Name *</label>
                <input type="text" name="customerName" required placeholder="John Doe" />
              </div>
              <div className="filter-group">
                <label>Customer Phone *</label>
                <input type="tel" name="customerPhone" required placeholder="+1234567890" />
              </div>
              <div className="filter-group">
                <label>Customer Email</label>
                <input type="email" name="customerEmail" placeholder="customer@example.com" />
              </div>
              <div className="filter-group">
                <label>Product Name *</label>
                <input type="text" name="productName" required placeholder="Product name" />
              </div>
              <div className="filter-group">
                <label>Quantity *</label>
                <input type="number" name="quantity" required min="1" defaultValue="1" />
              </div>
              <div className="filter-group">
                <label>Total Amount ($) *</label>
                <input type="number" name="totalAmount" required min="0" step="0.01" placeholder="99.99" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn-primary">
                Create Order
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="filters">
        <div className="filter-group">
          <label>Status</label>
          <select 
            value={filters.status} 
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="return_processing">Return Processing</option>
            <option value="returned">Returned</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Search</label>
          <input 
            type="text" 
            placeholder="Order ID, Customer Name, Phone"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Orders Table */}
      <div className="table-container">
        <div className="table-header">
          <h2>All Orders ({orders.length})</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length > 0 ? (
              orders.map((order) => (
                <tr key={order._id}>
                  <td><strong>{order.orderId}</strong></td>
                  <td>{order.customerName}</td>
                  <td>{order.customerPhone}</td>
                  <td>${order.totalAmount.toFixed(2)}</td>
                  <td>
                    <span className={`badge badge-${order.status}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>{new Date(order.orderDate).toLocaleDateString()}</td>
                  <td>
                    {order.status === 'pending' && (
                      <button 
                        className="btn btn-primary" 
                        onClick={() => handleStatusUpdate(order.orderId, 'processing')}
                        style={{ fontSize: '12px', padding: '5px 10px', marginRight: '5px' }}
                      >
                        Process
                      </button>
                    )}
                    {order.status === 'processing' && (
                      <button 
                        className="btn btn-primary" 
                        onClick={() => handleStatusUpdate(order.orderId, 'shipped')}
                        style={{ fontSize: '12px', padding: '5px 10px' }}
                      >
                        Ship
                      </button>
                    )}
                    {order.status === 'shipped' && (
                      <button 
                        className="btn btn-success" 
                        onClick={() => handleStatusUpdate(order.orderId, 'delivered')}
                        style={{ fontSize: '12px', padding: '5px 10px' }}
                      >
                        Deliver
                      </button>
                    )}
                    {order.status === 'return_processing' && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleStatusUpdate(order.orderId, 'returned')}
                        style={{ fontSize: '12px', padding: '5px 10px' }}
                      >
                        Complete Return
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                  No orders found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Orders;
