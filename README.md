# QuickFix - On-Demand Home Service Booking Platform

![QuickFix Banner](https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80)

**QuickFix** is a full-stack, production-ready On-Demand Home Service Booking Platform (Uber/Rapido + Urban Company style) connecting customers with nearby skilled workers (Electricians, Plumbers, Carpenters, AC Technicians, Drivers, Mechanics, Cleaners, Painters, etc.).

---

## 🌟 Key Features

### 1. Customer Features
- **Landing & Discovery**: Animated landing page, 24+ service category catalog, search filters.
- **Booking Engine**: Instant 15-minute emergency booking & scheduled booking, issue description, problem photo uploads.
- **Live Worker Tracking**: Google Maps JS integration showing real-time GPS worker movement & route renderer.
- **Security & OTP**: 6-digit OTP verification required before worker starts job.
- **Payment Gateway**: Razorpay (UPI, Credit/Debit Cards, NetBanking), QuickFix Wallet, and Cash on Delivery.
- **PDF Invoices**: Automated PDF invoice generator for completed jobs.
- **Rating & Reviews**: Rate technicians (1-5 stars) and write detailed reviews.

### 2. Worker Features
- **Registration & Document Verification**: Upload Aadhaar, PAN Card, Driving License, and Certificates.
- **Online/Offline Availability**: Toggle online state to start or stop receiving jobs.
- **Real-Time Job Requests**: Socket.IO alert popup modal with job details & accept button.
- **Job Lifecycle**: Navigation route, arrived at location, OTP verification, start work, pause, upload completion photos.
- **Earnings & Wallet**: Track Daily, Weekly, and Monthly earnings; request bank withdrawals.

### 3. Admin Control Center
- **Analytics KPI Dashboard**: High-level metrics for revenue, platform commission, customers, workers, and jobs.
- **Interactive Charts**: Chart.js Area Chart for Monthly Revenue growth and Doughnut Chart for Category distribution.
- **Worker Document Verification**: Inspect uploaded Aadhaar/PAN documents and Approve or Reject worker accounts.
- **Withdrawal Management**: Approve or reject worker bank withdrawal requests.
- **System Activity Logs**: Audit logs for security actions.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | HTML5, CSS3 (Glassmorphism & Custom Responsive Design), JavaScript (ES6+), Bootstrap 5.3, Font Awesome 6, AOS Animations, SweetAlert2, Chart.js, Socket.IO Client, Google Maps JS API |
| **Backend** | Node.js, Express.js, JWT Authentication, Bcrypt.js, Socket.IO Server, Express Validator, Helmet, CORS, Multer, PDFKit, Nodemailer, Morgan, Dotenv |
| **Database** | MySQL 8.0 with `mysql2` connection pool & async wrappers |
| **Integrations** | Google Maps / Places / Directions API, Razorpay Payment Gateway API |

---

## 📂 Folder Structure

```text
e:/Quickfix-project/
├── backend/
│   ├── config/             # DB & Razorpay SDK configs
│   ├── controllers/        # Express controllers (Auth, Booking, Admin, Worker, Customer, Payment, Review)
│   ├── middleware/         # JWT Auth, Multer upload, Validator & Error handler
│   ├── routes/             # REST API endpoint routers
│   ├── services/           # PDF Invoice & Notification services
│   ├── socket/             # Socket.IO real-time event handlers
│   ├── uploads/            # Profile avatars, documents, work photos
│   ├── utils/              # Distance calculator, OTP generator, response handler
│   └── server.js           # Main Express & Socket.IO server
├── client/
│   ├── assets/             # CSS stylesheets, JS utilities, Google Maps & Socket scripts
│   ├── customer/           # Customer Dashboard HTML
│   ├── worker/             # Worker Partner Dashboard HTML
│   ├── admin/              # Admin Control Center HTML
│   ├── index.html          # Landing Page
│   ├── services.html       # Services Directory
│   ├── booking.html        # Interactive Booking Page
│   ├── history.html        # Customer Booking History & Invoice download
│   ├── payment.html        # Payment Checkout Modal
│   ├── login.html          # Tabbed Login (Customer, Worker, Admin)
│   └── register.html       # Customer & Worker Registration
├── database/
│   └── quickfix.sql        # Complete MySQL DDL Schema (25 Tables) & Seed Data
├── package.json
├── .env.example
├── API_DOCUMENTATION.md
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18.0.0 or higher)
- MySQL Server (v8.0 or higher)

### 1. Database Setup
Import the SQL schema and seed data into your MySQL database:
```bash
mysql -u root -p < database/quickfix.sql
```

### 2. Environment Variables
Copy `.env.example` to `.env` and adjust your MySQL credentials:
```bash
cp .env.example .env
```

### 3. Install Dependencies & Start Server
```bash
npm install
npm start
```
The server will boot up at **`http://localhost:5000`**.

---

## 🔑 Demo Login Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `j21137202@gmail.com` | `password123` |
| **Worker (Verified Electrician)** | `rajesh.electrician@gmail.com` | `password123` |
| **Worker (Verified Plumber)** | `suresh.plumber@gmail.com` | `password123` |
| **Customer** | `customer@gmail.com` | `password123` |

---

## 📄 License
This project is licensed under the MIT License.
