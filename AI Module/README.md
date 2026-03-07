# Rayeva AI Systems Assignment - Module 1

## Module
AI Auto-Category & Tag Generator (MERN)

## Features
- Accepts product `name` and `description`
- Calls OpenAI (`gpt-4o-mini`) for AI classification
- Enforces predefined `primary_category`
- Generates `sub_category`, `seo_tags` (5-10), and `sustainability_filters`
- Returns structured JSON
- Stores AI output in MongoDB (`Product`)
- Logs prompt + AI response (`AILog`)

## Project Structure
- `backend/` Express + MongoDB + OpenAI API
- `frontend/` React app (Vite)

## Backend Setup
1. Go to backend:
   - `cd backend`
2. Install dependencies:
   - `npm install`
3. Create env file:
   - Copy `.env.example` to `.env`
4. Start backend:
   - `npm run dev`

Backend runs on `http://localhost:5000`

## Frontend Setup
1. Go to frontend:
   - `cd frontend`
2. Install dependencies:
   - `npm install`
3. Create env file:
   - Copy `.env.example` to `.env`
4. Start frontend:
   - `npm run dev`

Frontend runs on `http://localhost:5173`

## API
### POST `/api/products`
Request JSON:
```json
{
  "name": "Bamboo Toothbrush",
  "description": "Eco-friendly toothbrush with biodegradable bamboo handle and soft bristles"
}
```

Response JSON:
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Bamboo Toothbrush",
    "description": "...",
    "aiData": {
      "primary_category": "Personal Care",
      "sub_category": "Oral Care",
      "seo_tags": ["eco toothbrush", "bamboo toothbrush", "sustainable oral care", "zero waste", "biodegradable"],
      "sustainability_filters": ["biodegradable", "reusable", "plastic-free"]
    },
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

## Real Example Samjho

Maan lo user product add kare:

**Product Name:** Eco Carry Bag  
**Description:**  
"Reusable cotton shopping bag made from 100% organic cotton. Plastic-free, biodegradable and suitable for grocery use."

### 🤖 AI su karse?

AI aa description read karse ane return karse:

```json
{
   "primary_category": "Packaging",
   "sub_category": "Reusable Bags",
   "seo_tags": [
      "eco-friendly bag",
      "organic cotton",
      "plastic-free",
      "biodegradable",
      "reusable grocery bag"
   ],
   "sustainability_filters": [
      "plastic-free",
      "biodegradable",
      "reusable"
   ]
}
```

### 🎯 Module 1 ma tamaru kaam su che?

Tamare 5 step karvana che:

✅ **Step 1 – Frontend Form Banavo**

User:
- Product name lakhse
- Description lakhse
- Generate button dabavse

✅ **Step 2 – Backend API Banavo**

Frontend → backend ne data mokalse:

```json
{
   "name": "Eco Carry Bag",
   "description": "Reusable cotton shopping bag..."
}
```

✅ **Step 3 – OpenAI ne Call Karvo**

Backend:
- AI ne prompt mokalse
- Strict JSON ma response mangse

✅ **Step 4 – AI Output Validate Karvo**

Check karvu:
- Category predefined list mathi che?
- JSON valid che?

Example predefined list:
- Packaging
- Office Supplies
- Kitchenware
- Personal Care
- Apparel
- Home Essentials

AI "Electronics" aape to reject karvu ❌

✅ **Step 5 – Database ma Save Karvu**

MongoDB ma save karvu:

```json
{
   "name": "Eco Carry Bag",
   "description": "...",
   "aiData": {
      "primary_category": "Packaging",
      "sub_category": "Reusable Bags",
      "seo_tags": ["..."],
      "sustainability_filters": ["..."]
   }
}
```

### 🏗 System Flow Diagram

User → React Form → Express API → OpenAI → Validate → Save in MongoDB → Return result → Show on screen

### 📌 Why Company Aa Karavdave Che?

Because real business ma:
- 1000 product manually categorize karvu mushkel
- AI automatically kare to time save
- SEO tags automatically generate thai
- Sustainability filters business logic ma use thai sake
