# Nexus Events 🎫

A production-ready, high-performance event ticketing and management platform built with a premium, glassmorphic Cyber-theme.

![Nexus Events Banner](public/images/tech_conference.png)

## 🚀 Key Features

- **Premium UI/UX**: Full glassmorphic design system using Vanilla HTML/JS and Tailwind CSS.
- **Dynamic Event Management**: Complete administrative dashboard for creating, updating, and deleting events.
- **Secure Ticketing**: 
    - **Paystack Integration**: Seamless payment processing for ticket sales.
    - **Automated QR Generation**: Tickets include a unique QR code for gate validation.
    - **Email Confirmation**: Real-time email receipts sent via Nodemailer.
- **2-Step Gate Flow**: 
    - **Verify Phase**: Confirm ticket authenticity without checking the guest in.
    - **Admit Phase**: Mark the ticket as used to prevent duplicates.
- **Admin Dashboard**:
    - **Live Analytics**: Real-time revenue and ticket sales tracking.
    - **Interactive Charts**: Visual sales performance data using Chart.js.
    - **Mobile-First Validation**: Native camera scanning support for gate staff.

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)
- **Security**: JWT Authentication, CORS, Dotenv
- **Payments**: Paystack API
- **Email**: Nodemailer + QRCode.js
- **Frontend**: Tailwind CSS, Chart.js, Custom Nexus Notification System

## ⚙️ Quick Start

### 1. Prerequisites
- Node.js (v16+)
- MongoDB Atlas or Local instance

### 2. Installation
```bash
git clone https://github.com/Highziki/Nexus-Events.git
cd Nexus-Events
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
PAYSTACK_SECRET_KEY=your_paystack_secret
JWT_SECRET=your_secret_key
ADMIN_USER=admin
ADMIN_PASS=nexus2026
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_googleapp_password
PUBLIC_URL=http://localhost:3000
```

### 4. Run Application
```bash
npm run dev
```

## 🔐 Administrative Access
- **Login**: `/login`
- **Dashboard**: `/admin`
- **Validation Portal**: `/validate` (accessible via mobile scanning)
