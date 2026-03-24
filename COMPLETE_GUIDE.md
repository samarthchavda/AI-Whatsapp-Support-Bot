# AI WhatsApp Support Bot - Complete Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [How to Use](#how-to-use)
7. [Features Guide](#features-guide)
8. [API Documentation](#api-documentation)
9. [Troubleshooting](#troubleshooting)
10. [Project Structure](#project-structure)

---

## 🎯 Overview

A comprehensive AI-powered WhatsApp support bot built with the MERN stack. Features a modern dark-themed dashboard with glassmorphism effects, real-time QR code display, automated customer support, order management, and intelligent escalation system.

### Key Highlights
- 🤖 AI-powered conversation handling with Gemini
- 📱 Real-time WhatsApp QR code in frontend
- 🌙 Professional dark-themed dashboard
- 💬 Conversation tracking and analytics
- 📦 Order management system
- 🚨 Smart escalation system
- 📊 Real-time statistics and insights

---

## ✨ Features

### 1. **AI-Powered Conversations**
- Automatic intent detection (order status, returns, refunds, complaints)
- Natural language processing with Google Gemini AI
- Context-aware responses
- Conversation logging and history
- Multiple conversation states (active, escalated, resolved, closed)

### 2. **WhatsApp Integration**
- Real-time QR code display in frontend
- Socket.IO for live updates
- Session management
- Message handling and replies
- Status tracking (sent, delivered, read)

### 3. **Order Management**
- Real-time order status queries
- Track orders by phone number or order ID
- Order lifecycle management (pending → processing → shipped → delivered)
- Customer database integration
- Order history tracking

### 4. **Return Policy Handling**
- Automated return policy information
- Category-specific policies (general, electronics, clothing)
- Return timeframe calculations
- Condition verification

### 5. **Smart Escalation System**
- High-priority keyword detection
- Automatic escalation for refunds and complaints
- Priority levels (urgent, high, medium, low)
- Escalation tracking and resolution management
- Email notifications

### 6. **Modern Dashboard**
- Dark-themed professional interface
- Glassmorphism effects
- Real-time analytics and statistics
- Conversation monitoring
- Order management interface
- Escalation queue management
- AI status indicators

### 7. **Demo Data Management**
- Easy data clearing
- Demo data seeding
- Reset functionality
- Test phone numbers

---

## 🛠 Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **Socket.IO** - Real-time communication
- **whatsapp-web.js** - WhatsApp integration
- **Google Gemini AI** - AI processing
- **Puppeteer** - Browser automation

### Frontend
- **React** - UI library
- **React Router** - Navigation
- **Socket.IO Client** - Real-time updates
- **Axios** - HTTP client
- **React Icons** - Icon library
- **QRCode.react** - QR code display

---

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud)
- WhatsApp account
- Google Gemini API key

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd "AI WhatsApp Support Bot"
```

### Step 2: Install Backend Dependencies
```bash
cd backend
npm install
```

### Step 3: Install Frontend Dependencies
```bash
cd frontend
npm install
```

### Step 4: Configure Environment
Create `backend/.env` file:
```env
# Server Configuration
PORT=5001

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/whatsapp-support-bot

# AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Bot Configuration
HIGH_PRIORITY_KEYWORDS=urgent,critical,emergency,refund,complaint,angry

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Email Configuration (optional)
ADMIN_EMAIL=admin@example.com
ESCALATION_EMAIL=support@example.com
```

### Step 5: Setup Demo Data
```bash
cd backend
npm run reset-demo
```

This will:
- Clear all existing data
- Remove WhatsApp session
- Add demo customers, orders, conversations
- Display demo phone numbers

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| PORT | Backend server port | Yes |
| MONGODB_URI | MongoDB connection string | Yes |
| GEMINI_API_KEY | Google Gemini API key | Yes |
| GEMINI_MODEL | AI model to use | No |
| HIGH_PRIORITY_KEYWORDS | Keywords for escalation | No |
| FRONTEND_URL | Frontend URL for CORS | No |

### Demo Data

The system includes 3 demo customers:
- **John Doe**: +1234567890
- **Jane Smith**: +1234567891
- **Bob Johnson**: +1234567892

---

## 🚀 How to Use

### Starting the Application

#### 1. Start Backend Server
```bash
cd backend
npm run dev
```

You'll see:
```
🚀 Server running on port 5001
✅ Connected to MongoDB
🔌 Socket.IO ready for real-time updates
📱 Starting WhatsApp Web Session...
```

#### 2. Start Frontend
```bash
cd frontend
npm start
```

Browser opens at `http://localhost:3000`

#### 3. Connect WhatsApp

**Option A: Via Frontend (Recommended)**
1. Navigate to "WhatsApp Connect" in sidebar
2. Wait for QR code to appear
3. Open WhatsApp on phone
4. Go to Settings → Linked Devices
5. Tap "Link a Device"
6. Scan QR code on screen
7. Wait for "Connected Successfully!" message

**Option B: Via Terminal**
- QR code also appears in backend terminal
- Scan with WhatsApp app

### Using the Dashboard

#### Dashboard Page
- View total conversations, orders, escalations
- See resolved conversations with ratings
- Monitor recent conversations
- Track recent escalations
- Real-time statistics

#### Conversations Page
- View all conversations
- Filter by status (active, escalated, resolved)
- Filter by escalation status
- View message history
- Resolve conversations
- See customer details

#### Orders Page
- View all orders
- Track order status
- See customer information
- Monitor order lifecycle
- Update order status

#### Escalations Page
- View all escalations
- Filter by priority (urgent, high, medium, low)
- Filter by status (pending, in_progress, resolved)
- Assign to team members
- Add resolution notes
- Close escalations

#### WhatsApp Connect Page
- View connection status
- See QR code for scanning
- Monitor real-time status updates
- Check server connection
- AI status indicator

---

## 📖 Features Guide

### Feature 1: AI Conversation Handling

**How it works:**
1. Customer sends WhatsApp message
2. Bot receives message via whatsapp-web.js
3. AI processes message with Gemini
4. Intent is detected (order_status, return_policy, etc.)
5. Appropriate response is generated
6. Reply is sent to customer
7. Conversation is logged in database

**Supported Intents:**
- `order_status` - Check order status
- `cancel_order` - Cancel an order
- `return_policy` - Ask about returns
- `refund_request` - Request refund
- `complaint` - File complaint
- `general_inquiry` - General questions

**Example Queries:**
```
"What's my order status?"
"Track order ORD-002"
"I want to return my product"
"What's your return policy?"
"I need a refund"
"My order is damaged"
```

### Feature 2: Real-Time QR Code Display

**How it works:**
1. Backend initializes WhatsApp client
2. QR code is generated by WhatsApp
3. Backend emits QR code via Socket.IO
4. Frontend receives and displays QR code
5. Status updates sent in real-time
6. Connection confirmed when scanned

**Status Flow:**
```
connecting → waiting_qr → qr_ready → authenticated → ready
```

**Benefits:**
- No terminal access needed
- Multiple users can view QR code
- Visual feedback
- Real-time updates
- Better user experience

### Feature 3: Smart Escalation System

**How it works:**
1. Message is analyzed for keywords
2. High-priority keywords trigger escalation
3. Escalation record is created
4. Priority level is assigned
5. Notification is sent
6. Appears in escalation queue

**Escalation Triggers:**
- Keywords: urgent, critical, emergency, refund, complaint, angry
- Refund requests
- Complaints
- Unresolved issues
- Customer requests

**Priority Levels:**
- **Urgent**: Immediate attention required
- **High**: Important, needs quick response
- **Medium**: Normal priority
- **Low**: Can wait

### Feature 4: Order Tracking

**How it works:**
1. Customer asks about order
2. Bot extracts order ID or phone number
3. Database is queried
4. Order details are retrieved
5. Status and tracking info sent
6. Conversation is logged

**Order Statuses:**
- `pending` - Order placed, awaiting processing
- `processing` - Being prepared
- `shipped` - On the way
- `delivered` - Completed
- `cancelled` - Cancelled
- `return_processing` - Return in progress
- `returned` - Returned

### Feature 5: Demo Data Management

**Commands:**

```bash
# Clear all data
npm run clear-data

# Add demo data
npm run seed

# Clear and add demo data
npm run reset-demo

# Reset WhatsApp session
npm run reset-session
```

**What gets cleared:**
- All conversations
- All orders
- All customers
- All escalations
- All AI logs
- WhatsApp session

**What gets added:**
- 3 demo customers
- 10 demo orders
- 5 demo conversations
- 2 demo escalations
- 5 invoices
- 3 return policies
- 3 payment policies

### Feature 6: Dark Theme Dashboard

**Design Elements:**
- Glassmorphism sidebar with blur effects
- Dark zinc/slate color palette
- Gradient buttons with glow
- AI status indicators
- Smooth animations
- Responsive layout

**Color Scheme:**
- Background: #09090b (nearly black)
- Cards: rgba(24, 24, 27, 0.6) (semi-transparent)
- Primary: #6366f1 (indigo)
- Success: #10b981 (emerald)
- Danger: #ef4444 (red)
- Text: #fafafa (white) / #71717a (gray)

---

## 🔌 API Documentation

### Base URL
```
http://localhost:5001/api
```

### Endpoints

#### Dashboard
```
GET /dashboard/stats
- Get dashboard statistics
- Returns: conversations, orders, escalations, recent data

GET /dashboard/escalations
- Get all escalations
- Query params: page, limit, status, priority
- Returns: escalations array, pagination info

PATCH /dashboard/escalations/:id
- Update escalation
- Body: { status, assignedTo, resolution }
- Returns: updated escalation
```

#### Conversations
```
GET /conversations
- Get all conversations
- Query params: status, escalated
- Returns: conversations array

GET /conversations/:id
- Get conversation by ID
- Returns: conversation object

GET /conversations/phone/:phone
- Get conversations by phone
- Returns: conversations array

PATCH /conversations/:id
- Update conversation
- Body: { status, satisfaction }
- Returns: updated conversation
```

#### Orders
```
GET /orders
- Get all orders
- Query params: status, customerPhone
- Returns: orders array

GET /orders/:id
- Get order by ID
- Returns: order object

GET /orders/phone/:phone
- Get orders by phone
- Returns: orders array

POST /orders
- Create new order
- Body: order data
- Returns: created order

PATCH /orders/:id
- Update order
- Body: order updates
- Returns: updated order

DELETE /orders/:id
- Delete order
- Returns: success message
```

#### WhatsApp
```
POST /webhook/send
- Send WhatsApp message
- Body: { phoneNumber, message, messageType }
- Returns: success status

GET /webhook/status
- Get WhatsApp status
- Returns: connection status
```

---

## 🐛 Troubleshooting

### Issue: Backend won't start

**Error: Port already in use**
```bash
# Kill process on port 5001
lsof -ti:5001 | xargs kill -9

# Or change PORT in .env
PORT=5002
```

**Error: MongoDB connection failed**
```bash
# Check if MongoDB is running
mongosh

# Update MONGODB_URI in .env
MONGODB_URI=mongodb://localhost:27017/whatsapp-support-bot
```

### Issue: Frontend shows errors

**Error: Can't resolve 'socket.io-client'**
```bash
cd frontend
npm install socket.io-client qrcode.react
```

**Error: Proxy error**
```bash
# Make sure backend is running first
cd backend
npm run dev
```

### Issue: QR Code not showing

**Problem: "Waiting for QR code..." forever**

Solutions:
1. Check backend terminal for errors
2. Restart backend: `Ctrl+C` then `npm run dev`
3. Check browser console for Socket.IO errors
4. Clear browser cache and refresh

**Problem: QR code expired**
- WhatsApp generates new QR code automatically
- Frontend will update with new QR code
- No action needed - just wait

### Issue: WhatsApp not connecting

**Error: Browser already running**
```bash
cd backend
npm run reset-session
```

**Error: Session authentication failed**
```bash
# Clear session and restart
rm -rf .wwebjs_auth .wwebjs_cache
npm run dev
```

### Issue: AI not responding

**Error: Invalid API key**
- Check GEMINI_API_KEY in .env
- Get new key from Google AI Studio
- Restart backend

**Error: Rate limit exceeded**
- Wait a few minutes
- Reduce request frequency
- Check API quota

### Issue: Data not showing

**Problem: Dashboard shows "No conversations yet"**

Solutions:
```bash
cd backend
npm run reset-demo
```

**Problem: Old data still showing**
- Hard refresh browser: `Ctrl+Shift+R` or `Cmd+Shift+R`
- Clear browser cache
- Restart frontend

---

## 📁 Project Structure

```
AI WhatsApp Support Bot/
├── backend/
│   ├── config/              # Configuration files
│   ├── controllers/         # Route controllers
│   │   ├── dashboardController.js
│   │   ├── conversationController.js
│   │   ├── orderController.js
│   │   └── webhookController.js
│   ├── models/              # MongoDB models
│   │   ├── Conversation.js
│   │   ├── Order.js
│   │   ├── Customer.js
│   │   ├── Escalation.js
│   │   └── AILog.js
│   ├── routes/              # API routes
│   │   ├── dashboardRoutes.js
│   │   ├── conversationRoutes.js
│   │   ├── orderRoutes.js
│   │   └── webhookRoutes.js
│   ├── services/            # Business logic
│   │   ├── whatsappWebBot.js    # WhatsApp integration
│   │   ├── aiService.js         # AI processing
│   │   └── orderIdService.js    # Order ID generation
│   ├── scripts/             # Utility scripts
│   │   ├── seedData.js          # Demo data seeding
│   │   └── clearUserData.js     # Data clearing
│   ├── .env                 # Environment variables
│   ├── server.js            # Main server file
│   └── package.json         # Dependencies
│
├── frontend/
│   ├── public/              # Static files
│   ├── src/
│   │   ├── pages/           # Page components
│   │   │   ├── Dashboard.js
│   │   │   ├── Conversations.js
│   │   │   ├── Orders.js
│   │   │   ├── Escalations.js
│   │   │   ├── WhatsAppConnect.js
│   │   │   └── DemoChat.js
│   │   ├── services/        # API services
│   │   │   └── api.js
│   │   ├── styles/          # CSS files
│   │   ├── App.js           # Main app component
│   │   ├── App.css          # Global styles
│   │   └── index.js         # Entry point
│   └── package.json         # Dependencies
│
└── COMPLETE_GUIDE.md        # This file
```

---

## 🎓 Complete Usage Guide

### Scenario 1: Setting Up for First Time

```bash
# 1. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Configure environment
cp backend/.env.example backend/.env
# Edit .env with your settings

# 3. Setup demo data
cd backend
npm run reset-demo

# 4. Start backend
npm run dev

# 5. Start frontend (new terminal)
cd frontend
npm start

# 6. Connect WhatsApp
# Visit http://localhost:3000/whatsapp-connect
# Scan QR code
```

### Scenario 2: Testing the Bot

```bash
# 1. Make sure bot is running and connected

# 2. Send test message from demo number
# Use: +1234567890, +1234567891, or +1234567892

# 3. Try these messages:
"What's my order status?"
"Track ORD-002"
"I want to return my product"
"What's your return policy?"
"URGENT! My order is damaged!"

# 4. Check dashboard for updates
# Visit http://localhost:3000
```

### Scenario 3: Clearing and Resetting Data

```bash
# Clear all data and add fresh demo data
cd backend
npm run reset-demo

# Or do it separately:
npm run clear-data  # Clear only
npm run seed        # Add demo data only

# Reset WhatsApp session
npm run reset-session
```

### Scenario 4: Monitoring Conversations

```bash
# 1. Visit Conversations page
http://localhost:3000/conversations

# 2. Filter conversations
- Select status: active, escalated, resolved
- Select escalated: yes, no

# 3. View conversation details
- Click "View" button
- See full message history
- Check intent detection

# 4. Resolve conversation
- Click "Resolve" button
- Conversation moves to resolved status
```

### Scenario 5: Managing Escalations

```bash
# 1. Visit Escalations page
http://localhost:3000/escalations

# 2. Filter escalations
- Select priority: urgent, high, medium, low
- Select status: pending, in_progress, resolved

# 3. Handle escalation
- Click "View" or "Resolve"
- Add resolution notes
- Assign to team member
- Update status

# 4. Close escalation
- Mark as resolved
- Add final notes
```

---

## 🔐 Security Best Practices

1. **Environment Variables**
   - Never commit .env file
   - Use strong API keys
   - Rotate keys regularly

2. **Database**
   - Use strong MongoDB passwords
   - Enable authentication
   - Regular backups

3. **API**
   - Rate limiting enabled
   - CORS configured
   - Helmet security headers

4. **WhatsApp**
   - Keep session secure
   - Don't share QR codes
   - Monitor for unauthorized access

---

## 📊 Performance Tips

1. **Database Optimization**
   - Indexes on frequently queried fields
   - Limit query results
   - Use pagination

2. **Frontend Optimization**
   - Lazy loading components
   - Memoization for expensive operations
   - Debounce search inputs

3. **Backend Optimization**
   - Connection pooling
   - Caching frequently accessed data
   - Async/await for I/O operations

---

## 🚀 Deployment

### Backend Deployment (Heroku/Railway)

```bash
# 1. Set environment variables
# 2. Deploy code
# 3. Run migrations
npm run seed

# 4. Monitor logs
```

### Frontend Deployment (Vercel/Netlify)

```bash
# 1. Build production
npm run build

# 2. Set environment variables
REACT_APP_API_URL=https://your-backend-url.com

# 3. Deploy
```

---

## 📝 License

This project is licensed under the ISC License.

---

## 🤝 Support

For issues or questions:
1. Check this guide
2. Review troubleshooting section
3. Check backend logs
4. Check browser console
5. Verify all dependencies installed

---

## 🎉 Summary

This AI WhatsApp Support Bot provides:
- ✅ Complete automation of customer support
- ✅ Real-time WhatsApp integration
- ✅ AI-powered conversation handling
- ✅ Modern dark-themed dashboard
- ✅ Order and escalation management
- ✅ Easy setup and configuration
- ✅ Demo data for testing
- ✅ Comprehensive documentation

**Quick Start:**
```bash
cd backend && npm install && npm run reset-demo && npm run dev
cd frontend && npm install && npm start
# Visit http://localhost:3000/whatsapp-connect and scan QR code
```

**That's it! You're ready to use the AI WhatsApp Support Bot!** 🚀
