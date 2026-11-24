import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaTags, FaSyncAlt, FaSearch, FaFilter, FaExternalLinkAlt, FaBoxOpen, FaLayerGroup, FaShopify, FaPlug, FaChevronLeft, FaChevronRight, FaRobot } from 'react-icons/fa';
import api from '../../../services/api';
import { fetchStoreConnections } from '../../../services/storeConnections';
import './Products.css';

const PRODUCTS_PER_PAGE = 15;

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [syncMessage, setSyncMessage] = useState('');
  const [connections, setConnections] = useState({ shopify: null, woocommerce: null });
  const [connectionError, setConnectionError] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [totalLeads, setTotalLeads] = useState(0);
  const hasShopifyIntegration = Boolean(connections.shopify);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setConnectionError('');
      setCatalogError('');
      const activeConnections = await fetchStoreConnections();
      setConnections(activeConnections);
      if (!activeConnections.shopify) {
        setProducts([]);
        setTotalLeads(0);
        return;
      }

      try {
        const responseData = (await api.get('/knowledge-base')).data;
        if (responseData?.success === false || !Array.isArray(responseData?.data)) {
          throw new Error(responseData?.error || 'Product catalog response is unavailable.');
        }
        const kbItems = responseData?.data || [];
        
        const realLeads = responseData?.productLeadsCount || 0;
        setTotalLeads(realLeads);

        const rawProducts = Array.isArray(kbItems) ? kbItems.filter(item => 
          item.fileType === 'product' || item.type === 'product' || item.category === 'product' || item.source === 'shopify'
        ) : [];
        
        const mappedProducts = rawProducts.map(item => ({
          _id: item._id,
          title: item.title,
          price: item.productData?.price || 'Price unavailable',
          sku: item.productData?.sku || 'N/A',
          category: item.productData?.category || item.category || 'Shopify Product',
          image: item.productData?.image || '',
          stock: item.productData?.stock ?? null,
          status: item.productData?.stock == null ? 'Stock not tracked' : Number(item.productData.stock) > 0 ? 'In Stock' : 'Out of Stock'
        }));

        setProducts(mappedProducts);
      } catch (error) {
        setProducts([]);
        setTotalLeads(0);
        setCatalogError(error.response?.data?.error || error.message || 'Product catalog could not be loaded. Please retry.');
      }
    } catch (err) {
      console.error('Error fetching products or integrations:', err);
      setConnections({ shopify: null, woocommerce: null });
      setProducts([]);
      setTotalLeads(0);
      setConnectionError(err.response?.data?.error || err.message || 'Store connection could not be checked.');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncShopify = async () => {
    if (!hasShopifyIntegration || syncing) return;
    try {
      setSyncing(true);
      setSyncMessage('Syncing Shopify catalog into AI Knowledge Base...');
      const activeConnections = await fetchStoreConnections();
      if (!activeConnections.shopify) {
        setConnections(activeConnections);
        setProducts([]);
        setSyncMessage('Connect an active Shopify store before syncing products.');
        return;
      }
      await api.post('/knowledge-base/sync-shopify-products');
      setSyncMessage('✅ Shopify product catalog successfully synced!');
      await fetchData();
    } catch (err) {
      setSyncMessage(err.response?.data?.error || 'Product sync failed. Check your Shopify connection and try again.');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(''), 4000);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
    setCurrentPage(1);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const indexOfLastProduct = currentPage * PRODUCTS_PER_PAGE;
  const indexOfFirstProduct = indexOfLastProduct - PRODUCTS_PER_PAGE;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);

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
        <div className="sync-alert-banner" role="status">
          {syncMessage}
        </div>
      )}

      {/* Top Metrics Cards */}
      {!loading && hasShopifyIntegration && !connectionError && !catalogError && <div className="product-metrics-grid">
        <Link to="/dashboard/leads" className="metric-card clickable-metric-card" title="Click to view WhatsApp Leads CRM">
          <div className="metric-icon-box leads-icon">
            <FaRobot />
          </div>
          <div>
            <div className="metric-value">{totalLeads}</div>
            <div className="metric-label">
              Product Inquiry WhatsApp Leads Captured <FaExternalLinkAlt style={{ fontSize: '10px', marginLeft: '4px' }} />
            </div>
          </div>
        </Link>

        <div className="metric-card">
          <div className="metric-icon-box count-icon">
            <FaLayerGroup />
          </div>
          <div>
            <div className="metric-value">{products.length}</div>
            <div className="metric-label">Active Products Synced in AI Brain</div>
          </div>
        </div>
      </div>}

      {/* Controls Bar */}
      {!loading && hasShopifyIntegration && !connectionError && !catalogError && products.length > 0 && (
        <div className="products-controls-bar">
          <div className="search-input-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search products by title or SKU..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="products-search-input"
            />
          </div>

          <div className="filter-select-wrapper">
            <FaFilter className="filter-icon" />
            <select 
              value={selectedCategory} 
              onChange={handleCategoryChange}
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
      ) : connectionError ? (
        <div className="products-empty-card" role="alert">
          <h2 className="empty-title">Could not check store connection</h2>
          <p className="empty-description">{connectionError}</p>
          <button onClick={fetchData} className="sync-now-action-btn">Retry</button>
        </div>
      ) : !hasShopifyIntegration ? (
        /* Not Connected State */
        <div className="products-empty-card">
          <div className="empty-icon-wrapper shopify-brand">
            <FaShopify />
          </div>
          <h2 className="empty-title">Connect Shopify to view products</h2>
          <p className="empty-description">
            {connections.woocommerce ? 'Your WooCommerce store is connected, but this product catalog currently syncs from Shopify.' : 'Connect an active Shopify store first. Then sync its products into your AI Knowledge Base and view them here.'}
          </p>
          <Link to="/dashboard/integrations#shopify" className="connect-shopify-action-btn">
            <FaPlug /> Connect Shopify Store
          </Link>
        </div>
      ) : catalogError ? (
        <div className="products-empty-card" role="alert">
          <h2 className="empty-title">Product catalog unavailable</h2>
          <p className="empty-description">{catalogError}</p>
          <button onClick={fetchData} className="sync-now-action-btn">Retry</button>
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
          <button onClick={() => { setSearchTerm(''); setSelectedCategory('all'); setCurrentPage(1); }} className="sync-now-action-btn">
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          {/* Products Grid (15 per page) */}
          <div className="products-grid">
            {currentProducts.map(product => (
              <div key={product._id} className="product-card">
                <div className="product-image-container">
                  {product.image ? <img src={product.image} alt={product.title} className="product-image" /> : <FaBoxOpen className="product-image-placeholder" aria-label="No product image" />}
                </div>

                <div className="product-details">
                  <div className="product-category">{product.category || 'Shopify Product'}</div>
                  <h3 className="product-name">{product.title}</h3>
                  
                  <div className="product-price-row">
                    <span className="product-price">{product.price}</span>
                    {product.originalPrice && (
                      <span className="product-original-price">{product.originalPrice}</span>
                    )}
                    <span className={`stock-status-badge ${product.status === 'In Stock' ? 'in-stock' : ''}`}>
                      {product.status}
                    </span>
                  </div>

                  <div className="product-meta">
                    <span>SKU: {product.sku || 'N/A'}</span>
                    <span>Stock: <strong>{product.stock == null ? 'Not tracked' : product.stock}</strong></span>
                  </div>

                  <div className="product-action-footer">
                    {/* <button className="view-product-btn">
                      <FaRobot /> AI Sales Config
                    </button> */}
                    <a 
                      href="https://admin.shopify.com" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="shopify-link-btn"
                      style={{ width: '100%' }}
                      title="View on Shopify Admin"
                    >
                      <FaExternalLinkAlt /> View on Shopify Admin
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination-container">
              <button 
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <FaChevronLeft /> Previous
              </button>

              <div className="pagination-pages">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    className={`page-number-btn ${currentPage === page ? 'active' : ''}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button 
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next <FaChevronRight />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Products;
