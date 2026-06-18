import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaPaperPlane, FaRobot, FaUser, FaCircle, FaSearch, FaPhone, FaCommentDots } from 'react-icons/fa';
import io from 'socket.io-client';
import { getConversations, getConversationsByPhone, sendConversationMessage, updateConversation } from '../services/api';
import './LiveChat.css';

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || `http://${window.location.hostname}:5001`;

const AVATAR_COLORS = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #ec4899, #be185d)',
  'linear-gradient(135deg, #3b82f6, #1d4ed8)'
];

function LiveChat() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [togglingBot, setTogglingBot] = useState(false);
  const messagesEndRef = useRef(null);

  const getInitials = (name) =>
    (name || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const getAvatarColor = (name) =>
    AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getConversations({ limit: 100 });
      const list = response.data.conversations || [];
      const sorted = [...list].sort(
        (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
      );
      setConversations(sorted);
      setSelectedConversation((prev) => {
        if (prev) {
          return sorted.find((c) => c._id === prev._id) || sorted[0] || null;
        }
        return sorted[0] || null;
      });
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (customerPhone) => {
    try {
      const response = await getConversationsByPhone(customerPhone);
      setMessages(response.data.conversation?.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    }
  }, []);

  const toggleBotPause = async () => {
    if (!selectedConversation) return;
    
    try {
      setTogglingBot(true);
      const newPausedState = !selectedConversation.botPaused;
      const response = await updateConversation(selectedConversation._id, {
        botPaused: newPausedState
      });
      
      setSelectedConversation(response.data);
      await fetchConversations();
    } catch (error) {
      console.error('Error toggling bot state:', error);
      alert('Failed to toggle AI bot status');
    } finally {
      setTogglingBot(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socket.on('new_message', (data) => {
      fetchConversations();
      if (selectedConversation && data && data.customerPhone === selectedConversation.customerPhone) {
        fetchMessages(selectedConversation.customerPhone);
        getConversationsByPhone(selectedConversation.customerPhone).then(response => {
          if (response.data?.success && response.data?.conversation) {
            setSelectedConversation(response.data.conversation);
          }
        }).catch(err => console.error('Error refreshing selected conversation:', err));
      }
    });
    return () => socket.disconnect();
  }, [fetchConversations, selectedConversation, fetchMessages]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.customerPhone);
    }
  }, [selectedConversation, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation) return;

    try {
      setSending(true);
      await sendConversationMessage({
        customerPhone: selectedConversation.customerPhone,
        message: messageInput,
        sender: 'admin'
      });
      setMessageInput('');
      await fetchMessages(selectedConversation.customerPhone);
      await fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const diff = Date.now() - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const formatMessageTime = (date) =>
    new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const lastMessagePreview = (conv) => {
    if (!conv.messages?.length) return 'No messages yet';
    const last = conv.messages[conv.messages.length - 1];
    const text = last.content || '';
    return text.length > 48 ? `${text.substring(0, 48)}…` : text;
  };

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      conv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.customerPhone.includes(searchQuery);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && conv.status === 'active') ||
      (statusFilter === 'escalated' && conv.escalated) ||
      (statusFilter === 'resolved' && conv.status === 'resolved');
    return matchesSearch && matchesStatus;
  });

  const activeCount = conversations.filter((c) => c.status === 'active').length;
  const escalatedCount = conversations.filter((c) => c.escalated).length;

  return (
    <div className="container live-chat-page">
      <div className="live-chat-page-header">
        <div>
          <h1 className="page-title">Live Chat</h1>
          <p className="page-subtitle">
            {activeCount} active · {escalatedCount} escalated · {conversations.length} total
          </p>
        </div>
      </div>

      <div className="live-chat-container">
        <div className="conversations-sidebar">
          <div className="sidebar-header">
            <h2><FaCommentDots /> Inbox</h2>
            <div className="active-count">
              <FaCircle className="pulse-dot" />
              {activeCount} Active
            </div>
          </div>

          <div className="chat-filter-tabs">
            {['all', 'active', 'escalated', 'resolved'].map((tab) => (
              <button
                key={tab}
                type="button"
                className={`chat-filter-tab ${statusFilter === tab ? 'active' : ''}`}
                onClick={() => setStatusFilter(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by name or phone..."
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
                <p>No conversations match your filters</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv._id}
                  className={`conversation-item ${selectedConversation?._id === conv._id ? 'active' : ''}`}
                  onClick={() => setSelectedConversation(conv)}
                >
                  <div
                    className="conversation-avatar"
                    style={{ background: getAvatarColor(conv.customerName) }}
                  >
                    {getInitials(conv.customerName)}
                  </div>
                  <div className="conversation-info">
                    <div className="conversation-header">
                      <span className="customer-name">{conv.customerName}</span>
                      <span className="conversation-time">
                        {formatTime(conv.updatedAt || conv.createdAt)}
                      </span>
                    </div>
                    <div className="conversation-preview">
                      <span className="last-message">{lastMessagePreview(conv)}</span>
                    </div>
                    <div className="conversation-meta">
                      <span className={`status-badge status-${conv.status}`}>{conv.status}</span>
                      {conv.escalated && (
                        <span className="status-badge status-escalated">escalated</span>
                      )}
                      {conv.botPaused && (
                        <span className="status-badge status-paused">AI Paused</span>
                      )}
                      {conv.messages?.length > 0 && (
                        <span className="message-count">{conv.messages.length} msgs</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="chat-window">
          {selectedConversation ? (
            <>
              <div className="chat-header">
                <div className="chat-header-left">
                  <div
                    className="customer-avatar-large"
                    style={{ background: getAvatarColor(selectedConversation.customerName) }}
                  >
                    {getInitials(selectedConversation.customerName)}
                  </div>
                  <div className="customer-details">
                    <h3>{selectedConversation.customerName}</h3>
                    <div className="customer-contact">
                      <span><FaPhone /> {selectedConversation.customerPhone}</span>
                    </div>
                  </div>
                </div>
                <div className="chat-header-right" style={{ display: 'flex', alignItems: 'center' }}>
                  <button
                    type="button"
                    className={`ai-toggle-btn ${selectedConversation.botPaused ? 'paused' : 'active'}`}
                    onClick={toggleBotPause}
                    disabled={togglingBot}
                    title={selectedConversation.botPaused ? "Click to resume AI Bot replies" : "Click to pause AI Bot replies"}
                  >
                    <FaRobot />
                    <span>{selectedConversation.botPaused ? 'AI Paused' : 'AI Active'}</span>
                  </button>
                  <span className={`status-indicator status-${selectedConversation.status}`}>
                    <FaCircle /> {selectedConversation.status}
                  </span>
                </div>
              </div>

              <div className="messages-area">
                {messages.length === 0 ? (
                  <div className="empty-messages">
                    <p>No messages yet. Send a reply to start.</p>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`message-bubble ${
                        msg.role === 'user'
                          ? 'customer-message'
                          : msg.role === 'assistant'
                          ? 'ai-message'
                          : 'admin-message'
                      }`}
                    >
                      <div className="message-header">
                        <span className="message-sender">
                          {msg.role === 'user' ? (
                            <><FaUser /> {selectedConversation.customerName}</>
                          ) : msg.role === 'assistant' ? (
                            <><FaRobot /> AI Assistant</>
                          ) : (
                            <><FaUser /> You (Agent)</>
                          )}
                        </span>
                        <span className="message-time">{formatMessageTime(msg.timestamp)}</span>
                      </div>
                      <div className="message-content">{msg.content}</div>
                      {msg.translation && (
                        <div className="message-translation">
                          <span className="translation-badge">
                            {msg.role === 'user' ? (
                              `🌐 Translated from ${msg.detectedLanguage || 'foreign language'}:`
                            ) : msg.role === 'assistant' ? (
                              `🌐 Translated from ${msg.detectedLanguage || 'foreign language'}:`
                            ) : (
                              `🌐 Sent in ${msg.detectedLanguage || 'foreign language'}:`
                            )}
                          </span>
                          <div className="translation-text">{msg.translation}</div>
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="message-input-area">
                {selectedConversation.suggestedReply && (
                  <div className="ai-suggested-draft-container">
                    <div className="ai-suggested-draft-header">
                      <div className="draft-title">
                        <FaRobot className="draft-icon-robot" />
                        <span>AI Suggested Draft</span>
                      </div>
                      <div className="draft-actions">
                        <button
                          type="button"
                          className="draft-action-btn apply"
                          onClick={() => setMessageInput(selectedConversation.suggestedReply)}
                        >
                          Use Draft
                        </button>
                        <button
                          type="button"
                          className="draft-action-btn dismiss"
                          onClick={async () => {
                            try {
                              const response = await updateConversation(selectedConversation._id, {
                                suggestedReply: null
                              });
                              setSelectedConversation(response.data);
                              await fetchConversations();
                            } catch (err) {
                              console.error('Failed to dismiss draft:', err);
                            }
                          }}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                    <div className="ai-suggested-draft-content">
                      {selectedConversation.suggestedReply}
                    </div>
                  </div>
                )}

                {selectedConversation.botPaused ? (
                  <div className="input-notice paused">
                    <FaRobot /> AI Bot is paused. You have taken over this chat manually.
                  </div>
                ) : (
                  <div className="input-notice">
                    <FaRobot /> AI Bot is active. Replying here will automatically pause the AI Bot.
                  </div>
                )}
                <form onSubmit={sendMessage} className="message-input-form">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    disabled={sending}
                  />
                  <button type="submit" disabled={sending || !messageInput.trim()}>
                    {sending ? <div className="spinner-small"></div> : <FaPaperPlane />}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="no-conversation-selected">
              <div className="empty-state-large">
                <div className="empty-icon"><FaCommentDots /></div>
                <h3>Select a conversation</h3>
                <p>Choose a customer from the inbox to view messages and reply</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LiveChat;
