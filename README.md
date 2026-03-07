# AI WhatsApp Support Bot

A comprehensive AI-powered WhatsApp support bot built with the MERN stack (MongoDB, Express.js, React, Node.js). This bot automatically handles customer support queries, manages orders, answers return policy questions, and escalates high-priority issues to human agents.

## Features

### AI-Powered Conversations
- Automatic intent detection (order status, returns, refunds, complaints)
- Natural language processing with AI service integration
- Context-aware responses with conversation logging
- Support for multiple conversation states (active, escalated, resolved, closed)

### Order Management
- Real-time order status queries
- Track orders by phone number or order ID
- Order lifecycle management (pending -> processing -> shipped -> delivered)
- Integration with customer database

### Return Policy Handling
- Automated return policy information
- Category-specific policies (general, electronics, clothing, etc.)
- Return timeframe calculations
- Condition verification

### Smart Escalation System
- High-priority keyword detection
- Automatic escalation for refunds and complaints
- Priority levels (urgent, high, medium, low)
- Escalation tracking and resolution management

### Admin Dashboard
- Real-time analytics and statistics
- Conversation monitoring
- Order management interface
- Escalation queue management

## Tech Stack

### Backend
- Node.js and Express.js
- MongoDB and Mongoose
- whatsapp-web.js
- Axios, CORS, Helmet, Morgan

### Frontend
- React
- React Router
- Axios
- React Icons

## Project Structure

```text
AI WhatsApp Support Bot/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── scripts/
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── pages/
│   │   ├── services/
│   │   └── styles/
│   └── package.json
└── README.md
```

## Run Locally

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

The frontend starts at `http://localhost:3000` and backend typically runs on `http://localhost:5000`.

## WhatsApp Bot Setup

1. Start the backend server.
2. Scan the QR code shown in terminal from WhatsApp Linked Devices.
3. Wait for the bot ready message.

## Usage

Customers can ask for:
- Order status updates
- Return/refund policy details
- Cancellation requests
- Complaint registration

Admins can use the frontend to:
- Monitor conversations
- Manage orders
- Review escalations
- Track support activity

## API Endpoints

### Orders
- `GET /api/orders`
- `GET /api/orders/:id`
- `GET /api/orders/phone/:phone`
- `POST /api/orders`
- `PATCH /api/orders/:id`
- `DELETE /api/orders/:id`

### Conversations
- `GET /api/conversations`
- `GET /api/conversations/:id`
- `GET /api/conversations/phone/:phone`
- `GET /api/conversations/stats`
- `PATCH /api/conversations/:id`

### Dashboard
- `GET /api/dashboard/stats`
- `GET /api/dashboard/escalations`
- `PATCH /api/dashboard/escalations/:id`

### Webhook
- `POST /api/webhook/whatsapp`
- `POST /api/webhook/send`
- `GET /api/webhook/status`

## Configuration

Set backend environment values in `backend/.env`:

```env
PORT=5000
MONGODB_URI=your_mongodb_uri
GEMINI_API_KEY=your_gemini_api_key
HIGH_PRIORITY_KEYWORDS=urgent,critical,emergency,refund,complaint,angry
```

## Notes

- Order IDs are auto-generated in `ORD-###` format.
- Phone number normalization is used for reliable matching.
- Conversations and AI logs are stored for auditing and improvements.
