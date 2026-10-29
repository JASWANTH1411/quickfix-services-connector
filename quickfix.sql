-- QuickFix Database Schema & Seed Data
-- MySQL 8.0 Compatible

CREATE DATABASE IF NOT EXISTS quickfix_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE quickfix_db;

-- Disable Foreign Key Checks for clean table creation
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS password_reset;
DROP TABLE IF EXISTS otp;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS complaints;
DROP TABLE IF EXISTS support;
DROP TABLE IF EXISTS ratings;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS withdraw_requests;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS wallet;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS worker_locations;
DROP TABLE IF EXISTS booking_status;
DROP TABLE IF EXISTS booking_images;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS coupons;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS worker_documents;
DROP TABLE IF EXISTS workers;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS admins;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. Admins Table
CREATE TABLE admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    role ENUM('superadmin', 'admin', 'moderator') DEFAULT 'admin',
    avatar VARCHAR(255) DEFAULT '/uploads/profile/default-admin.png',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Customers Table
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    avatar VARCHAR(255) DEFAULT '/uploads/profile/default-user.png',
    address TEXT,
    city VARCHAR(100) DEFAULT 'Mumbai',
    pincode VARCHAR(10),
    latitude DECIMAL(10, 8) DEFAULT 19.07600000,
    longitude DECIMAL(11, 8) DEFAULT 72.87770000,
    is_verified TINYINT(1) DEFAULT 0,
    status ENUM('active', 'suspended', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Workers Table
CREATE TABLE workers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    avatar VARCHAR(255) DEFAULT '/uploads/profile/default-worker.png',
    category_id INT NOT NULL,
    experience_years INT DEFAULT 1,
    hourly_rate DECIMAL(10, 2) DEFAULT 350.00,
    bio TEXT,
    city VARCHAR(100) DEFAULT 'Mumbai',
    pincode VARCHAR(10) DEFAULT '400001',
    address TEXT,
    latitude DECIMAL(10, 8) DEFAULT 19.07600000,
    longitude DECIMAL(11, 8) DEFAULT 72.87770000,
    is_online TINYINT(1) DEFAULT 0,
    is_verified TINYINT(1) DEFAULT 0,
    verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    rejection_reason TEXT,
    rating_avg DECIMAL(3, 2) DEFAULT 5.00,
    total_reviews INT DEFAULT 0,
    total_jobs_completed INT DEFAULT 0,
    bank_account_number VARCHAR(50),
    bank_ifsc VARCHAR(20),
    bank_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Worker Documents Table
CREATE TABLE worker_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    worker_id INT NOT NULL,
    aadhaar_number VARCHAR(20),
    aadhaar_file VARCHAR(255),
    pan_number VARCHAR(20),
    pan_file VARCHAR(255),
    driving_license_number VARCHAR(30),
    driving_license_file VARCHAR(255),
    certificates_file VARCHAR(255),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP NULL,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

-- 5. Categories Table
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(100) DEFAULT 'fa-tools',
    description TEXT,
    image VARCHAR(255) DEFAULT '/uploads/categories/default.jpg',
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Services Table
CREATE TABLE services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(50) DEFAULT 'per job',
    estimated_time VARCHAR(50) DEFAULT '60 mins',
    image VARCHAR(255) DEFAULT '/uploads/services/default.jpg',
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- 7. Coupons Table
CREATE TABLE coupons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_percentage DECIMAL(5, 2) NOT NULL,
    max_discount_amount DECIMAL(10, 2) DEFAULT 500.00,
    min_booking_amount DECIMAL(10, 2) DEFAULT 200.00,
    valid_until DATE,
    usage_limit INT DEFAULT 100,
    times_used INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Bookings Table
CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_code VARCHAR(30) UNIQUE NOT NULL,
    customer_id INT NOT NULL,
    worker_id INT DEFAULT NULL,
    service_id INT NOT NULL,
    category_id INT NOT NULL,
    problem_description TEXT,
    booking_type ENUM('instant', 'scheduled') DEFAULT 'instant',
    scheduled_date DATE NULL,
    scheduled_time TIME NULL,
    customer_address TEXT NOT NULL,
    customer_city VARCHAR(100) DEFAULT 'Mumbai',
    customer_pincode VARCHAR(10) DEFAULT '400001',
    customer_latitude DECIMAL(10, 8) NOT NULL,
    customer_longitude DECIMAL(11, 8) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    commission_amount DECIMAL(10, 2) DEFAULT 0.00,
    worker_earnings DECIMAL(10, 2) DEFAULT 0.00,
    status ENUM('pending_approval', 'pending', 'approved', 'accepted', 'reached', 'in_progress', 'paused', 'completed', 'cancelled') DEFAULT 'pending_approval',
    cancellation_reason TEXT,
    coupon_id INT DEFAULT NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE SET NULL,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL
);

-- 9. Booking Images Table
CREATE TABLE booking_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    image_type ENUM('customer_problem', 'worker_completion') DEFAULT 'customer_problem',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- 10. Booking Status Log Table
CREATE TABLE booking_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'reached', 'in_progress', 'paused', 'completed', 'cancelled') NOT NULL,
    notes TEXT,
    updated_by_role ENUM('customer', 'worker', 'admin', 'system') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- 11. Worker Locations Table
CREATE TABLE worker_locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    worker_id INT UNIQUE NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    heading DECIMAL(5, 2) DEFAULT 0.00,
    speed DECIMAL(5, 2) DEFAULT 0.00,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

-- 12. Payments Table
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    customer_id INT NOT NULL,
    payment_method ENUM('razorpay', 'cash', 'upi', 'wallet', 'card', 'netbanking') NOT NULL,
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    razorpay_signature VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status ENUM('pending', 'success', 'failed', 'refunded') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- 13. Wallet Table
CREATE TABLE wallet (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    user_type ENUM('customer', 'worker') NOT NULL,
    balance DECIMAL(10, 2) DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY user_wallet_idx (user_id, user_type)
);

-- 14. Transactions Table
CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    wallet_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    type ENUM('credit', 'debit') NOT NULL,
    category ENUM('booking_payment', 'job_earning', 'wallet_topup', 'withdrawal', 'refund', 'commission') NOT NULL,
    description TEXT,
    reference_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wallet_id) REFERENCES wallet(id) ON DELETE CASCADE
);

-- 15. Withdraw Requests Table
CREATE TABLE withdraw_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    worker_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    bank_account VARCHAR(50) NOT NULL,
    ifsc VARCHAR(20) NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    admin_notes TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

-- 16. Notifications Table
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    user_type ENUM('customer', 'worker', 'admin') NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read TINYINT(1) DEFAULT 0,
    link VARCHAR(255) DEFAULT '#',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. Reviews Table
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT UNIQUE NOT NULL,
    customer_id INT NOT NULL,
    worker_id INT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

-- 18. Ratings Table
CREATE TABLE ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT UNIQUE NOT NULL,
    customer_id INT NOT NULL,
    worker_id INT NOT NULL,
    rating DECIMAL(2, 1) NOT NULL CHECK (rating >= 1.0 AND rating <= 5.0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

-- 19. Support Tickets Table
CREATE TABLE support (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_code VARCHAR(30) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    user_type ENUM('customer', 'worker') NOT NULL,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 20. Complaints Table
CREATE TABLE complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    complainant_id INT NOT NULL,
    complainant_type ENUM('customer', 'worker') NOT NULL,
    against_id INT NOT NULL,
    against_type ENUM('customer', 'worker') NOT NULL,
    reason VARCHAR(255) NOT NULL,
    details TEXT NOT NULL,
    status ENUM('pending', 'investigating', 'resolved', 'dismissed') DEFAULT 'pending',
    admin_action TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- 21. Messages (Chat) Table
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    sender_id INT NOT NULL,
    sender_type ENUM('customer', 'worker', 'admin') NOT NULL,
    receiver_id INT NOT NULL,
    receiver_type ENUM('customer', 'worker', 'admin') NOT NULL,
    message TEXT NOT NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- 22. OTP Table
CREATE TABLE otp (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone_or_email VARCHAR(150) NOT NULL,
    code VARCHAR(6) NOT NULL,
    purpose ENUM('verification', 'login', 'booking_start', 'password_reset') NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 23. Password Reset Table
CREATE TABLE password_reset (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 24. Activity Logs Table
CREATE TABLE activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    user_type VARCHAR(50) DEFAULT 'system',
    action VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 25. Sessions Table
CREATE TABLE sessions (
    session_id VARCHAR(128) PRIMARY KEY,
    expires INT UNSIGNED NOT NULL,
    data TEXT
);

-- SEED INITIAL DATA

-- Default Admin
INSERT INTO admins (name, email, password, phone, role) VALUES
('System Admin', 'j21137202@gmail.com', '$2a$10$VjkCF5Yq0ejUnqDQSGYkWOC3FQpoJJdvQkV1EbITLuuAXKOAvzJNS', '9876543210', 'superadmin');
-- Default password: password123

-- Default Categories (24 Categories)
INSERT INTO categories (id, name, slug, icon, description) VALUES
(1, 'Electrician', 'electrician', 'fa-bolt', 'Wiring, appliance installation, fuse box repairs & electrical safety.'),
(2, 'Plumber', 'plumber', 'fa-faucet', 'Pipe leak fixes, tap repairs, bathroom fitting & drainage cleaning.'),
(3, 'Carpenter', 'carpenter', 'fa-hammer', 'Furniture assembly, door lock fixing, cabinet repairs & woodwork.'),
(4, 'Painter', 'painter', 'fa-paint-roller', 'Interior wall painting, exterior coating & waterproofing.'),
(5, 'House Cleaning', 'house-cleaning', 'fa-broom', 'Regular house cleaning, floor mopping & dusting.'),
(6, 'Deep Cleaning', 'deep-cleaning', 'fa-sparkles', 'Intensive kitchen, bathroom & upholstery deep sanitization.'),
(7, 'Mechanic', 'mechanic', 'fa-wrench', 'On-spot car & bike breakdown repair, battery jumpstart.'),
(8, 'Driver', 'driver', 'fa-car-side', 'Professional hourly drivers for personal & commercial travel.'),
(9, 'Cook', 'cook', 'fa-utensils', 'Experienced home cooks for daily meal preparation.'),
(10, 'Babysitter', 'babysitter', 'fa-baby', 'Trusted & background-checked child care specialists.'),
(11, 'AC Repair', 'ac-repair', 'fa-snowflake', 'AC servicing, gas refilling, cooling repair & installation.'),
(12, 'TV Repair', 'tv-repair', 'fa-tv', 'LED/LCD TV panel, sound system & wall mounting.'),
(13, 'RO Repair', 'ro-repair', 'fa-filter', 'Water purifier filter replacement & membrane cleaning.'),
(14, 'Laptop Repair', 'laptop-repair', 'fa-laptop-code', 'Screen replacement, OS installation, motherboard fix.'),
(15, 'Mobile Repair', 'mobile-repair', 'fa-mobile-screen-button', 'Smartphone screen replacement, battery & charging port repair.'),
(16, 'Beautician', 'beautician', 'fa-scissors', 'Salon services at home: haircut, facial, waxing & bridal.'),
(17, 'Laundry', 'laundry', 'fa-shirt', 'Washing, dry cleaning, steam ironing & doorstep delivery.'),
(18, 'Gardener', 'gardener', 'fa-seedling', 'Lawn mowing, plant pruning, balcony garden setup.'),
(19, 'Pest Control', 'pest-control', 'fa-bug', 'Cockroach, termite, bed bug & mosquito eradication treatment.'),
(20, 'CCTV Installation', 'cctv-installation', 'fa-video', 'Security camera setup, DVR configuration & cabling.'),
(21, 'Solar Service', 'solar-service', 'fa-sun', 'Solar panel cleaning, inverter maintenance & installation.'),
(22, 'Moving Service', 'moving-service', 'fa-truck-ramp-box', 'Packers & movers for home & office relocation.'),
(23, 'Water Tank Cleaning', 'water-tank-cleaning', 'fa-water', 'Automated high-pressure underground & overhead tank cleaning.'),
(24, 'Generator Repair', 'generator-repair', 'fa-car-battery', 'Diesel/Gas generator servicing & troubleshooting.');

-- Default Services
INSERT INTO services (category_id, name, description, price, unit, estimated_time) VALUES
(1, 'Ceiling Fan Repair & Fitting', 'Complete inspection, capacitor replacement & fitting.', 299.00, 'per fan', '45 mins'),
(1, 'Short Circuit & Fuse Fix', 'Emergency electrical troubleshooting & wire replacement.', 499.00, 'per issue', '60 mins'),
(2, 'Tap Leakage & Valve Repair', 'Fixing leaking taps, shower heads & flush tanks.', 249.00, 'per tap', '30 mins'),
(2, 'Drainage Unclogging', 'High pressure pipe unclogging for sink & bathroom.', 599.00, 'per drain', '60 mins'),
(3, 'Furniture Assembly', 'IKEA & custom wooden furniture assembly.', 399.00, 'per item', '90 mins'),
(4, '1 BHK Full Paint Job', 'Premium washable paint coating for 1 BHK apartment.', 4999.00, 'full job', '2 days'),
(5, 'Full House Dusting & Mopping', 'Complete 2 BHK home dusting, sweeping & floor sanitization.', 799.00, 'full house', '120 mins'),
(11, 'Split AC Servicing & Jet Cleaning', 'Deep foam jet wash, filter cleaning & cooling check.', 699.00, 'per AC', '60 mins'),
(11, 'AC Gas Refilling (R32 / R410)', 'Full refrigerant gas top-up with leak test.', 1899.00, 'per AC', '90 mins'),
(14, 'Laptop Screen Replacement', 'Genuine display replacement with 6 months warranty.', 2499.00, 'per device', '120 mins');

-- Default Sample Coupon
INSERT INTO coupons (code, discount_percentage, max_discount_amount, min_booking_amount, valid_until) VALUES
('QUICK100', 20.00, 150.00, 299.00, '2027-12-31'),
('WELCOME50', 50.00, 200.00, 499.00, '2027-12-31');
