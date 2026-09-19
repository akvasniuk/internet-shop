# 🛒 ElectroShop — E-Commerce Web Application

A modern full-featured e-commerce web application featuring a client-side storefront, an administrative dashboard, a persistent cart and order management system, and interactive communications (real-time live customer support and an AI assistant).

---

## 🚀 Live Demo & Deployment

- **Frontend (GitHub Pages):** [https://akvasniuk.github.io/internet-shop/index.html](https://akvasniuk.github.io/internet-shop/index.html)
- **Backend API (Vercel):** [https://internet-shop-sandy.vercel.app](https://internet-shop-sandy.vercel.app)

---

## ✨ Key Features

- **Product Catalog:**
  - Debounced live product search
  - Category filtering and dynamic pagination
  - Detailed single-product view
- **Cart & Order Management:**
  - Persistent shopping cart state via `localStorage`
  - Client-side validation for delivery and contact details
  - Order placement flow and complete customer order history
- **Authentication & Access Control:**
  - JWT-based authentication flow (`accessToken`, `refreshToken`)
  - Route protection using a centralized `authGuard`
  - Role-based access control (`USER` vs. `ADMIN`)
- **Admin Dashboard:**
  - Full CRUD operations for product inventory (create, edit, delete)
  - File and image upload handling
  - Real-time warehouse metrics and category breakdown statistics
- **Interactive Chat Systems:**
  - **ElectroBot (AI Assistant):** Automated product advisory powered by the Google Gemini API
  - **Live Support Chat:** Real-time bi-directional customer service via WebSocket (Socket.io)

---

## 🛠 Tech Stack

### Frontend

- **HTML5 / CSS3 / Bootstrap 5** — Responsive layout and modern UI components
- **Vanilla JavaScript (ES Modules)** — Framework-free modular architecture
- **Socket.io Client** — Real-time event communication

### Backend

- **Node.js & Express.js** — REST API server
- **Socket.io** — Real-time WebSocket server for live support
- **Google Gemini API (`@google/genai`)** — Conversational AI integration
- **JWT (JSON Web Tokens)** — Secure stateless session management

---

## Getting Started Locally

### 1. Clone the repository

```bash
git clone https://github.com/akvasniuk/internet-shop.git
cd internet-shop
```

### 2. Run the frontend

Because the application uses native browser ES Modules (`type="module"`), serve the root directory using any local web server (e.g., the **Live Server** extension in VS Code) or via `npx`:

```bash
npx serve .
```

### 3. Setup the backend (if running locally)

Create a `.env` file in your backend directory with your credentials:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/internet-shop
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
ADMIN_ACCOUNT_PASSWORD=admin123
GEMINI_API_KEY=your_gemini_api_key
```

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

---
