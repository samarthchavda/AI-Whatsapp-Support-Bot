import React, { useState, useRef, useEffect } from 'react';
import * as api from '../../../services/api';
import '../../../styles/DemoChat.css';

const currencySymbols = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  CAD: '$',
  AUD: '$',
  JPY: '¥',
  AED: 'د.إ'
};

const getCurrencySymbol = (currencyCode) => {
  return currencySymbols[currencyCode] || '$';
};

const formatCurrency = (amount, currencyCode) => {
  const code = currencyCode || 'USD';
  try {
    return new Intl.NumberFormat(code === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: code
    }).format(amount);
  } catch (e) {
    const symbol = getCurrencySymbol(code);
    return `${symbol}${Number(amount).toFixed(2)}`;
  }
};

const DemoChat = ({ admin }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Hi there! 👋 I can help you with order status, returns, and more.',
      sender: 'bot',
      timestamp: '10:30',
      status: 'read'
    }
  ]);

  const [newMessage, setNewMessage] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [awaitingOrderId, setAwaitingOrderId] = useState(false);
  const [awaitingReturnConfirmation, setAwaitingReturnConfirmation] = useState(false);
  const [awaitingReturnOrderId, setAwaitingReturnOrderId] = useState(false);
  const messagesEndRef = useRef(null);

  // Fetch orders from MongoDB
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data } = await api.getOrders({ limit: 20 });
        setOrders(data.orders || []);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch specific order by ID
  const fetchOrderById = async (orderId) => {
    try {
      const { data } = await api.getOrderById(orderId);
      return data;
    } catch (error) {
      console.error('Error fetching order:', error);
      return null;
    }
  };

  const updateOrderInState = (updatedOrder) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.orderId === updatedOrder.orderId ? updatedOrder : order
      )
    );
  };

  const isAffirmative = (message) => {
    const normalized = message.trim().toLowerCase();
    return ['yes', 'y', 'haan', 'ha', 'h', 'sure', 'ok', 'okay', 'yes please'].includes(normalized);
  };

  const isNegative = (message) => {
    const normalized = message.trim().toLowerCase();
    return ['no', 'n', 'nah', 'nope', 'not now'].includes(normalized);
  };

  // Generate smart bot response
  const generateBotResponse = async (userMsg, currentAwaitingOrderId) => {
    const msgLower = userMsg.toLowerCase();

    if (awaitingReturnConfirmation) {
      if (isAffirmative(userMsg)) {
        setAwaitingReturnConfirmation(false);
        setAwaitingReturnOrderId(true);
        return '✅ Sure. Please share the Order ID you want to return (e.g., ORD-001).';
      }

      if (isNegative(userMsg)) {
        setAwaitingReturnConfirmation(false);
        return 'No problem. If you change your mind, type "return" anytime.';
      }

      return 'Please reply with "yes" to start return, or "no" to cancel.';
    }

    if (awaitingReturnOrderId) {
      const orderIdMatch = userMsg.match(/ORD-\d+/i);

      if (!orderIdMatch) {
        return '⚠️ Please provide a valid Order ID (example: ORD-001).';
      }

      const orderId = orderIdMatch[0].toUpperCase();
      const order = await fetchOrderById(orderId);

      if (!order) {
        return `❌ Order ${orderId} not found. Please check and try again.`;
      }

      if (order.status === 'returned') {
        setAwaitingReturnOrderId(false);
        return `↩️ Order ${order.orderId} is already marked as RETURNED.`;
      }

      if (order.status === 'return_processing') {
        setAwaitingReturnOrderId(false);
        return `🔄 Return for ${order.orderId} is already in progress.`;
      }

      if (order.status !== 'delivered') {
        setAwaitingReturnOrderId(false);
        return `⚠️ Return can only be started after delivery is complete. Current status for ${order.orderId}: ${order.status.toUpperCase()}.`;
      }

      try {
        const { data: updatedOrder } = await api.updateOrder(order.orderId, {
          status: 'return_processing',
          notes: 'Return initiated via demo chat'
        });

        updateOrderInState(updatedOrder);
        setAwaitingReturnOrderId(false);

        return `✅ Return initiated for ${updatedOrder.orderId}.\n📊 Order status is now: RETURN PROCESSING\n🕒 Our team will verify and complete it soon.`;
      } catch (error) {
        console.error('Error starting return:', error);
        setAwaitingReturnOrderId(false);
        return '❌ I could not start the return right now. Please try again in a moment.';
      }
    }

    // If waiting for order ID
    if (currentAwaitingOrderId) {
      // Extract order ID (e.g., ORD-001, ORD-006, etc.)
      const orderIdMatch = userMsg.match(/ORD-\d+/i);
      
      if (orderIdMatch) {
        const orderId = orderIdMatch[0].toUpperCase();
        const order = await fetchOrderById(orderId);
        
        if (order) {
          setAwaitingOrderId(false);
          return `📦 **${order.orderId}** 
💰 Amount: ${formatCurrency(order.totalAmount, admin?.currency)}
📊 Status: ${order.status.toUpperCase()}
📅 Order Date: ${new Date(order.orderDate).toLocaleDateString()}
${order.estimatedDelivery ? `⏰ Expected: ${new Date(order.estimatedDelivery).toLocaleDateString()}` : ''}
✋ Items: ${order.items.map(i => i.productName).join(', ')}`;
        } else {
          return `❌ Order ${orderId} not found. Please check the ID and try again.`;
        }
      } else {
        return '⚠️ Please provide a valid Order ID (e.g., ORD-001, ORD-006)';
      }
    }

    // Order status queries
    if (msgLower.includes('order') || msgLower.includes('status') || msgLower.includes('track')) {
      setAwaitingOrderId(true);
      return '📦 Please provide your Order ID (e.g., ORD-001, ORD-006, ORD-010, etc.) to check status.';
    }

    // Return policy
    if (msgLower.includes('return') || msgLower.includes('refund')) {
      setAwaitingReturnConfirmation(true);
      return '↩️ Our return policy allows returns within 30 days of purchase in original condition.\nReply "yes" to initiate return.';
    }

    // Shipping policies
    if (msgLower.includes('shipping') || msgLower.includes('delivery') || msgLower.includes('shipped')) {
      const symbol = getCurrencySymbol(admin?.currency);
      if (admin?.currency === 'INR') {
        return `🚚 Shipping Policy Info:\n- Free shipping on domestic orders over ₹999.00.\n- Standard Shipping: ₹99.00 flat rate (3-5 business days).\n- Express Shipping: ₹299.00 flat rate (1-2 business days).\n- We currently ship all over India.`;
      }
      return `🚚 Shipping Policy Info:\n- Free shipping on domestic orders over ${symbol}75.00.\n- Standard Shipping: ${symbol}5.99 flat rate (3-5 business days).\n- Express Shipping: ${symbol}14.99 flat rate (1-2 business days).\n- We currently ship to the US and Canada.`;
    }

    // Help/greeting (using boundary matching to prevent matching inside words like "shipping")
    const isGreeting = /\b(hi|hello|hii|hey|yo|greetings|hola)\b/i.test(msgLower);
    if (isGreeting) {
      return '👋 Hello! I\'m Kwickbot. I can help with:\n✅ Order status\n✅ Returns & Refunds\n✅ Delivery tracking\n✅ Escalation to support\n\nHow can I help?';
    }

    // Complaint/issue
    if (msgLower.includes('problem') || msgLower.includes('issue') || msgLower.includes('complaint')) {
      return '😟 I\'m sorry to hear that! Your issue has been escalated to our support team. They\'ll contact you within 2 hours. Reference: #ESC-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    }

    // List available orders
    if (msgLower.includes('list') || msgLower.includes('show') || msgLower.includes('available')) {
      if (orders.length > 0) {
        const ordersList = orders.slice(0, 5).map(o => o.orderId).join(', ');
        return `📋 Available Orders: ${ordersList}\n\nTry asking about any of these orders!`;
      }
    }

    return '🤖 I didn\'t understand that. Try asking about:\n📦 Order status\n↩️ Returns\n🚨 Report an issue';
  };

  const handleSendMessage = async () => {
    if (newMessage.trim()) {
      const userInput = newMessage;
      setNewMessage('');

      const userMsgId = Date.now();
      const userMsg = {
        id: userMsgId,
        text: userInput,
        sender: 'user',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sent'
      };

      setMessages(prev => [...prev, userMsg]);

      try {
        const adminData = JSON.parse(localStorage.getItem('admin') || '{}');
        const response = await api.testAIMessage({
          customerPhone: adminData.phone || '+919876543210',
          customerName: adminData.name || 'Test Customer',
          message: userInput
        });

        if (response.data?.success && response.data?.output?.message) {
          const botMsg = {
            id: Date.now() + 1,
            text: response.data.output.message,
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'read'
          };

          setMessages(prev => [...prev, botMsg]);

          // Mark user message as read
          setMessages(prev =>
            prev.map(msg =>
              msg.id === userMsgId ? { ...msg, status: 'read' } : msg
            )
          );
          return;
        }
      } catch (error) {
        console.warn('Backend AI response failed, falling back to local simulation:', error);
      }

      // Local fallback bot response after 800ms
      setTimeout(async () => {
        const botResponse = await generateBotResponse(userInput, awaitingOrderId);
        const botMsg = {
          id: Date.now() + 2,
          text: botResponse,
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'read'
        };
        setMessages(prev => [...prev, botMsg]);

        // Mark user message as read
        setMessages(prev =>
          prev.map(msg =>
            msg.id === userMsgId ? { ...msg, status: 'read' } : msg
          )
        );
      }, 800);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const MessageStatus = ({ status }) => {
    if (status === 'sent') {
      return <span className="message-status">✓</span>;
    } else if (status === 'read') {
      return <span className="message-status read">✓✓</span>;
    }
    return null;
  };

  return (
    <div className="demo-chat-container">
      <div className="chat-header">
        <div className="header-content">
          <h2>🤖 Kwickbot</h2>
          <p className="status-text">
            {loading ? 'Loading orders...' : `Online • ${orders.length} active orders`}
          </p>
        </div>
        <div className="header-icons">
          <span>📞</span>
          <span>⋮</span>
        </div>
      </div>

      <div className="chat-body">
        {messages.map((message) => (
          <div key={message.id} className={`message-wrapper ${message.sender}`}>
            <div className={`message ${message.sender}`}>
              <p style={{ whiteSpace: 'pre-line' }}>{message.text}</p>
              <div className="message-footer">
                <span className="timestamp">{message.timestamp}</span>
                {message.sender === 'user' && <MessageStatus status={message.status} />}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-footer">
        <div className="input-area">
          <button className="icon-btn">😊</button>
          <input
            type="text"
            placeholder={(awaitingOrderId || awaitingReturnOrderId) ? "Enter Order ID (e.g., ORD-001)..." : "Type a message..."}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="message-input"
          />
          {newMessage.trim() ? (
            <button onClick={handleSendMessage} className="send-btn">
              ➤
            </button>
          ) : (
            <button className="icon-btn">🎤</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DemoChat;
