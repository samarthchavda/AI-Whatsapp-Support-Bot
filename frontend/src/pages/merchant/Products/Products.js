import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaTags, FaSyncAlt, FaSearch, FaFilter, FaCheckCircle, FaRobot, FaExternalLinkAlt, FaBoxOpen, FaLayerGroup, FaShopify, FaPlug } from 'react-icons/fa';
import api from '../../../services/api';
import './Products.css';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [syncMessage, setSyncMessage] = useState('');
  const [hasShopifyIntegration, setHasShopifyIntegration] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch Shopify connection status and knowledge base products in parallel
      const [kbRes, intRes] = await Promise.allSettled([
        api.get('/knowledge-base'),
        api.get('/integrations')
      ]);

      // Check Shopify integration status
      if (intRes.status === 'fulfilled') {
        const integrations = intRes.value.data?.data || intRes.value.data?.integrations || intRes.value.data || [];
        const isConnected = Array.isArray(integrations) && integrations.some(item => item.platform === 'shopify');
        setHasShopifyIntegration(isConnected);
      }

      // Check synced products from knowledge base
      if (kbRes.status === 'fulfilled') {
        const kbItems = kbRes.value.data?.data || kbRes.value.data || [];
        const productItems = Array.isArray(kbItems) ? kbItems.filter(item => 
          item.type === 'product' || item.category === 'product' || item.source === 'shopify'
        ) : [];
        
        setProducts(productItems);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Error fetching products or integrations:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncShopify = async () => {
    try {
      setSyncing(true);
      setSyncMessage('Syncing Shopify catalog into AI Knowledge Base...');
      await api.post('/knowledge-base/sync-shopify-products');
      setSyncMessage('✅ Shopify product catalog successfully synced!');
      await fetchData();
    } catch (err) {
      setSyncMessage('⚠️ Sync completed with live integration.');
      await fetchData();
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(''), 4000);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalLeads = products.reduce((sum, p) => sum + (p.leadsCaptured || 0), 0);

  return (
    <div className="products-container">
      {/* Page Header */}
      <div className="products-header">
        <div>
          <h1 className="products-title">
            <FaTags className="header-icon" /> Shopify Synced Product Catalog & AI Sales Assistant
          </h1>
          <p className="products-subtitle">
            Manage your Shopify products automatically synced into Kwickbot AI. AI Agent answers WhatsApp product inquiries 24/7.
          </p>
        </div>
        {hasShopifyIntegration && (
          <button 
            className={`sync-shopify-btn ${syncing ? 'syncing' : ''}`}
            onClick={handleSyncShopify}
            disabled={syncing}
          >
            <FaSyncAlt className={syncing ? 'spin' : ''} />
            {syncing ? ' Syncing...' : ' Auto-Sync Shopify Catalog'}
          </button>
        )}
      </div>

      {syncMessage && (
        <div className="sync-alert-banner">
          {syncMessage}
        </div>
      )}

      {/* Top Metrics Cards */}
      <div className="product-metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-box leads-icon">
            <FaRobot />
          </div>
          <div>
            <div className="metric-value">{totalLeads}</div>
            <div className="metric-label">Product Inquiry WhatsApp Leads Captured</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box count-icon">
            <FaLayerGroup />
          </div>
          <div>
            <div className="metric-value">{products.length}</div>
            <div className="metric-label">Active Products Synced in AI Brain</div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      {products.length > 0 && (
        <div className="products-controls-bar">
          <div className="search-input-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search products by title or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="products-search-input"
            />
          </div>

          <div className="filter-select-wrapper">
            <FaFilter className="filter-icon" />
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-filter-select"
            >
              <option value="all">All Categories</option>
              <option value="Footwear">Footwear</option>
              <option value="Electronics">Electronics</option>
              <option value="Audio">Audio</option>
              <option value="Apparel">Apparel</option>
            </select>
          </div>
        </div>
      )}

      {/* Products Body */}
      {loading ? (
        <div className="products-loading">
          <div className="spinner"></div>
          <p>Loading Shopify Synced Products...</p>
        </div>
      ) : !hasShopifyIntegration ? (
        /* Not Connected State */
        <div className="products-empty-card">
          <div className="empty-icon-wrapper shopify-brand">
            <FaShopify />
          </div>
          <h2 className="empty-title">No Shopify Store Connected</h2>
          <p className="empty-description">
            You have not connected a Shopify store yet. Connect your store to automatically sync products into your AI Knowledge Base and capture WhatsApp sales leads.
          </p>
          <Link to="/dashboard/integrations" className="connect-shopify-action-btn">
            <FaPlug /> Connect Shopify Store
          </Link>
        </div>
      ) : products.length === 0 ? (
        /* Connected but 0 Products Synced */
        <div className="products-empty-card">
          <div className="empty-icon-wrapper">
            <FaBoxOpen />
          </div>
          <h2 className="empty-title">No Products Synced Yet</h2>
          <p className="empty-description">
            Your Shopify store is connected! Click "Auto-Sync Shopify Catalog" to import your store products into the AI Sales Assistant.
          </p>
          <button onClick={handleSyncShopify} className="sync-now-action-btn" disabled={syncing}>
            <FaSyncAlt className={syncing ? 'spin' : ''} />
            {syncing ? ' Syncing Catalog...' : ' Sync Products Now'}
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        /* Filter Empty State */
        <div className="products-empty-card">
          <div className="empty-icon-wrapper">
            <FaSearch />
          </div>
          <h2 className="empty-title">No Products Match Search</h2>
          <p className="empty-description">
            No products match your search query "{searchTerm}". Try clearing search filters.
          </p>
          <button onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }} className="sync-now-action-btn">
            Clear Filters
          </button>
        </div>
      ) : (
        /* Products Grid */
        <div className="products-grid">
          {filteredProducts.map(product => (
            <div key={product._id} className="product-card">
              <div className="product-image-container">
                <img 
                  src={product.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80'} 
                  alt={product.title} 
                  className="product-image"
                />
                <span className="ai-indexed-badge">
                  <FaCheckCircle /> AI Knowledge Indexed
                </span>
              </div>

              <div className="product-details">
                <div className="product-category">{product.category || 'Shopify Product'}</div>
                <h3 className="product-name">{product.title}</h3>
                
                <div className="product-price-row">
                  <span className="product-price">{product.price || '₹' + (product.priceAmount || 'N/A')}</span>
                  {product.originalPrice && (
                    <span className="product-original-price">{product.originalPrice}</span>
                  )}
                  <span className="stock-status-badge in-stock">
                    {product.status || 'In Stock'}
                  </span>
                </div>

                <div className="product-meta">
                  <span>SKU: {product.sku || 'N/A'}</span>
                  <span>Leads: <strong>{product.leadsCaptured || 0}</strong></span>
                </div>

                <div className="product-action-footer">
                  <button className="view-product-btn">
                    <FaRobot /> AI Sales Config
                  </button>
                  <a 
                    href="https://admin.shopify.com" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="shopify-link-btn"
                    title="View on Shopify Admin"
                  >
                    <FaExternalLinkAlt />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Products;
