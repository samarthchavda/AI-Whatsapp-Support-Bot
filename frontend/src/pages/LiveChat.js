import React, { useState, useEffect, useRef } from 'react';
import { FaPaperPlane, FaRobot, FaUser, FaCircle, FaSearch, FaPhone, FaEnvelope } from 'react-icons/fa';
import io from 'socket.io-client';
import axios from 'axios';
import './LiveChat.css';

function LiveChat() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io('http://localhost:5001');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to Socket.IO');
    });

    newSocket.on('new_message', (data) => {
      console.log('New message received:', data);
      // Update conversations list
      fetchConversations();
      
      // If this message is for the selected conversation, add it to messages
      if (selectedConversation && data.customerPhone === selectedConversation.customerPhone) {
        fetchMessages(selectedConversation.customerPhone);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [selectedConversation]);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.customerPhone);
    }
  }, [selectedConversation]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/conversations?limit=100', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Sort by last message time
      const sorted = response.data.conversations.sort((a, b) => 
        new Date(b.lastMessageAt || b.createdAt) - new Date(a.lastMessageAt || a.createdAt)
      );
      
      setConversations(sorted);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (customerPhone) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5001/api/conversations/phone/${customerPhone}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.conversation) {
        setMessages(response.data.conversation.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!messageInput.trim() || !selectedConversation) return;

    try {
      setSending(true);
      const token = localStorage.getItem('token');
      
      await axios.post(
        'http://localhost:5001/api/conversations/send-message',
        {
          customerPhone: selectedConversation.customerPhone,
          message: messageInput,
          sender: 'admin'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessageInput('');
      fetchMessages(selectedConversation.customerPhone);
      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    
    // Less than 1 minute
    if (diff < 60000) return 'Just now';
    
    // Less than 1 hour
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `${mins}m ago`;
    }
    
    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }
    
    // More than 24 hours
    return d.toLocaleDateString();
  };

  const formatMessageTime = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const filteredConversations = conversations.filter(conv => 
    conv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.customerPhone.includes(searchQuery)
  );

  return (
    <div className="live-chat-container">
      {/* Left Sidebar - Conversations List */}
      <div className="conversations-sidebar">
        <div className="sidebar-header">
          <h2>💬 Live Chat</h2>
          <div className="active-count">
            <FaCircle className="pulse-dot" />
            {conversations.filter(c => c.status === 'active').length} Active
          </div>
        </div>

        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="conversations-list">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading conversations...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="empty-state">
              <p>No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv._id}
                className={`conversation-item ${selectedConversation?._id === conv._id ? 'active' : ''}`}
                onClick={() => setSelectedConversation(conv)}
              >
                <div className="conversation-avatar">
                  <FaUser />
                </div>
                <div className="conversation-info">
                  <div className="conversation-header">
                    <span className="customer-name">{conv.customerName}</span>
                    <span className="conversation-time">{formatTime(conv.lastMessageAt || conv.createdAt)}</span>
                  </div>
                  <div className="conversation-preview">
                    <span className="last-message">
                      {conv.messages && conv.messages.length > 0
                        ? conv.messages[conv.messages.length - 1].content.substring(0, 50) + '...'
                        : 'No messages yet'}
                    </span>
                  </div>
                  <div className="conversation-meta">
                    <span className={`status-badge status-${conv.status}`}>
                      {conv.status}
                    </span>
                    {conv.messages && conv.messages.length > 0 && (
                      <span className="message-count">{conv.messages.length} messages</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Center - Chat Window */}
      <div className="chat-window">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <div className="chat-header-left">
                <div className="customer-avatar-large">
                  <FaUser />
                </div>
                <div className="customer-details">
                  <h3>{selectedConversation.customerName}</h3>
                  <div className="customer-contact">
                    <span><FaPhone /> {selectedConversation.customerPhone}</span>
                    {selectedConversation.customerEmail && (
                      <span><FaEnvelope /> {selectedConversation.customerEmail}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="chat-header-right">
                <span className={`status-indicator status-${selectedConversation.status}`}>
                  <FaCircle /> {selectedConversation.status}
                </span>
              </div>
            </div>

            {/* Messages Area */}
            <div className="messages-area">
              {messages.length === 0 ? (
                <div className="empty-messages">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`message-bubble ${msg.role === 'user' ? 'customer-message' : msg.role === 'assistant' ? 'ai-message' : 'admin-message'}`}
                  >
                    <div className="message-header">
                      <span className="message-sender">
                        {msg.role === 'user' ? (
                          <><FaUser /> {selectedConversation.customerName}</>
                        ) : msg.role === 'assistant' ? (
                          <><FaRobot /> AI Assistant</>
                        ) : (
                          <><FaUser /> Admin</>
                        )}
                      </span>
                      <span className="message-time">{formatMessageTime(msg.timestamp)}</span>
                    </div>
                    <div className="message-content">
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="message-input-area">
              <div className="input-notice">
                <FaRobot /> Sending as Admin - This message will bypass AI and go directly to customer
              </div>
              <form onSubmit={sendMessage} className="message-input-form">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Type your message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  disabled={sending}
                />
                <button type="submit" disabled={sending || !messageInput.trim()}>
                  {sending ? (
                    <div className="spinner-small"></div>
                  ) : (
                    <FaPaperPlane />
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="no-conversation-selected">
            <div className="empty-state-large">
              <div className="empty-icon">💬</div>
              <h3>Select a conversation</h3>
              <p>Choose a conversation from the left to start chatting with customers</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LiveChat;
