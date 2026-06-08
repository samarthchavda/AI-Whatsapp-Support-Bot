import React, { useState, useEffect } from 'react';
import { getOrders, updateOrder, createOrder } from '../services/api';

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  });
  const [searchInput, setSearchInput] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput }));
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchOrders();
  }, [filters.status, filters.search]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = { limit: 100 }; // Fetch up to 100 orders
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
    
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch('http://localhost:5001/api/orders', {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setShowCreateForm(false);
        fetchOrders();
        alert('Order created successfully');
        e.target.reset();
      } else {
        alert(data.error || 'Failed to create order');
      }
    } catch (err) {
      alert('Failed to create order');
      console.error('Error creating order:', err);
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const file = formData.get('bulkCsvFile');

    if (!file) {
      alert('Please select a CSV file');
      return;
    }

    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    try {
      setUploadProgress('Uploading...');
      
      const response = await fetch('http://localhost:5001/api/orders/bulk-upload', {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setShowBulkUpload(false);
        setUploadProgress(null);
        fetchOrders();
        alert(`Successfully imported ${data.data.successCount} orders!\n${data.data.failedCount > 0 ? `Failed: ${data.data.failedCount}` : ''}`);
        e.target.reset();
      } else {
        setUploadProgress(null);
        alert(data.error || 'Failed to upload CSV');
      }
    } catch (err) {
      setUploadProgress(null);
      alert('Failed to upload CSV file');
      console.error('Error uploading CSV:', err);
    }
  };

  const downloadSampleCSV = () => {
    const csvContent = `customerName,customerPhone,customerEmail,productName,quantity,totalAmount,status
John Doe,+1234567890,john@example.com,Premium Widget,2,199.99,pending
Jane Smith,+1234567891,jane@example.com,Deluxe Package,1,299.99,processing
Bob Johnson,+1234567892,bob@example.com,Standard Item,3,149.99,shipped`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_orders.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
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
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn-secondary" 
              onClick={() => setShowBulkUpload(!showBulkUpload)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span style={{ fontSize: '18px' }}>📤</span>
              Bulk Upload CSV
            </button>
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
      </div>

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <div className="table-container" style={{ marginBottom: '28px', background: 'rgba(99, 102, 241, 0.05)' }}>
          <div className="table-header" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)' }}>
            <h2>📤 Bulk Upload Orders from CSV</h2>
          </div>
          <form onSubmit={handleBulkUpload} style={{ padding: '28px' }} encType="multipart/form-data">
            <div style={{ marginBottom: '24px' }}>
              <div style={{ 
                background: 'rgba(99, 102, 241, 0.1)', 
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <h3 style={{ color: '#a5b4fc', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                  📋 CSV Format Requirements:
                </h3>
                <ul style={{ color: '#a1a1aa', fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
                  <li><strong>Required columns:</strong> customerName, customerPhone, productName, quantity, totalAmount</li>
                  <li><strong>Optional columns:</strong> customerEmail, status (default: pending)</li>
                  <li><strong>Status values:</strong> pending, processing, shipped, delivered, cancelled</li>
                  <li><strong>Phone format:</strong> Include country code (e.g., +1234567890)</li>
                  <li><strong>Amount format:</strong> Numbers only (e.g., 199.99)</li>
                </ul>
              </div>

              <div className="filter-group">
                <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'block' }}>
                  Select CSV File *
                </label>
                <input 
                  type="file" 
                  name="bulkCsvFile" 
                  accept=".csv"
                  required
                  style={{
                    width: '100%',
                    padding: '14px',
                    border: '2px dashed rgba(99, 102, 241, 0.5)',
                    borderRadius: '12px',
                    fontSize: '14px',
                    background: 'rgba(39, 39, 42, 0.6)',
                    color: '#fafafa',
                    cursor: 'pointer'
                  }}
                />
                <small style={{ color: '#71717a', fontSize: '12px', marginTop: '8px', display: 'block' }}>
                  Upload a CSV file with multiple orders (max 10MB)
                </small>
              </div>
            </div>

            {uploadProgress && (
              <div style={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                padding: '12px 16px',
                borderRadius: '10px',
                color: '#a5b4fc',
                fontSize: '14px',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                {uploadProgress}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={uploadProgress !== null}
                style={{ flex: 1 }}
              >
                {uploadProgress ? 'Uploading...' : 'Upload & Import Orders'}
              </button>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={downloadSampleCSV}
                style={{ flex: 1 }}
              >
                📥 Download Sample CSV
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowBulkUpload(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Order Form */}
      {showCreateForm && (
        <div className="table-container" style={{ marginBottom: '28px' }}>
          <div className="table-header">
            <h2>Create New Order</h2>
          </div>
          <form onSubmit={handleCreateOrder} style={{ padding: '28px' }} encType="multipart/form-data">
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
              <div className="filter-group" style={{ gridColumn: 'span 2' }}>
                <label>CSV File (Optional)</label>
                <input 
                  type="file" 
                  name="csvFile" 
                  accept=".csv"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid rgba(63, 63, 70, 0.5)',
                    borderRadius: '10px',
                    fontSize: '14px',
                    background: 'rgba(39, 39, 42, 0.6)',
                    color: '#fafafa',
                    cursor: 'pointer'
                  }}
                />
                <small style={{ color: '#71717a', fontSize: '12px', marginTop: '6px', display: 'block' }}>
                  Upload a CSV file with additional order data (max 5MB)
                </small>
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

        <div className="filter-group" style={{ flex: 1, minWidth: '300px' }}>
          <label>Search</label>
          <div style={{ position: 'relative', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input 
                type="text" 
                placeholder="Order ID, Customer Name, Phone"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{ width: '100%', paddingRight: searchInput ? '36px' : '14px' }}
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(63, 63, 70, 0.5)',
                    border: 'none',
                    borderRadius: '6px',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#a1a1aa',
                    fontSize: '14px'
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          {loading && searchInput && (
            <small style={{ color: '#6366f1', fontSize: '11px', marginTop: '4px', display: 'block' }}>
              🔍 Searching...
            </small>
          )}
          {!loading && searchInput && orders.length === 0 && (
            <small style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', display: 'block' }}>
              No results found for "{searchInput}"
            </small>
          )}
          {!loading && searchInput && orders.length > 0 && (
            <small style={{ color: '#10b981', fontSize: '11px', marginTop: '4px', display: 'block' }}>
              Found {orders.length} result{orders.length !== 1 ? 's' : ''}
            </small>
          )}
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
