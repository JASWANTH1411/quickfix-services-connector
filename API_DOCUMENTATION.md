# QuickFix REST API & Socket.IO Reference Documentation

## 🔐 Authentication Endpoints (`/api/auth`)

### 1. Register Customer
- **POST** `/api/auth/register/customer`
- **Body**: `{ name, email, password, phone, city, address }`
- **Response**: `{ status: "success", data: { token, user } }`

### 2. Register Worker
- **POST** `/api/auth/register/worker`
- **Content-Type**: `multipart/form-data`
- **Body**: `name`, `email`, `password`, `phone`, `category_id`, `experience_years`, `hourly_rate`, `bio`, `avatar` (file)
- **Response**: `{ status: "success", data: { token, user } }`

### 3. Unified Login
- **POST** `/api/auth/login`
- **Body**: `{ email, password, role }` (`role`: 'customer' | 'worker' | 'admin')
- **Response**: `{ status: "success", data: { token, user } }`

---

## 🛠️ Service Categories Endpoints (`/api/services`)

### 1. Get Categories
- **GET** `/api/services/categories`
- **Response**: Array of 24 active categories with service count.

### 2. Search Services
- **GET** `/api/services/search?query=electrician`

---

## 📅 Booking Endpoints (`/api/bookings`)

### 1. Create Booking
- **POST** `/api/bookings`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `service_id`, `category_id`, `problem_description`, `customer_address`, `latitude`, `longitude`, `booking_type` ('instant' | 'scheduled')
- **Response**: `{ booking_id, booking_code, otp, total_amount, nearby_workers_notified }`

### 2. Worker Accept Job
- **POST** `/api/bookings/accept`
- **Body**: `{ booking_id }`

### 3. Start Work (OTP Verification)
- **POST** `/api/bookings/start-work`
- **Body**: `{ booking_id, otp }`

### 4. Complete Work
- **POST** `/api/bookings/complete-work`
- **Body**: `booking_id`, `work_photo` (file)

---

## 💳 Payment Endpoints (`/api/payments`)

### 1. Razorpay Order
- **POST** `/api/payments/razorpay/order`
- **Body**: `{ booking_id }`

### 2. Verify Razorpay Payment
- **POST** `/api/payments/razorpay/verify`
- **Body**: `{ booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature }`

### 3. Download Invoice PDF
- **GET** `/api/payments/invoice/:bookingId`
- **Response**: Content-Type `application/pdf` download stream.

---

## ⚡ Socket.IO Real-Time Events Reference

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `join_room` | Client ➔ Server | `{ userId, userType }` | Joins private user notification channel |
| `new_booking_request` | Server ➔ Worker | `{ booking_id, service_name, total_amount, ... }` | Broadcast to online workers in category |
| `worker_location_update` | Worker ➔ Server | `{ workerId, latitude, longitude, customerId }` | Worker sends live GPS updates |
| `worker_location_live` | Server ➔ Customer | `{ workerId, latitude, longitude }` | Customer tracks worker position on map |
| `send_message` | Client ➔ Server | `{ bookingId, senderId, message, ... }` | Live chat message transmission |
