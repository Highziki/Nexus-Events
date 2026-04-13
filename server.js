require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');
const connectDB = require('./db');
const Event = require('./models/Event');
const Ticket = require('./models/Ticket');

const app = express();
const PORT = process.env.PORT || 3000;
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
connectDB();

// Clean HTML Routes
app.get('/events/:slug', (req, res) => res.sendFile(path.join(__dirname, 'public', 'event.html')));
app.get('/callback', (req, res) => res.sendFile(path.join(__dirname, 'public', 'callback.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/validate', (req, res) => res.sendFile(path.join(__dirname, 'public', 'validate.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

// ----------------------------------------------------
// AUTHENTICATION MIDDLEWARE
// ----------------------------------------------------
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Access Denied: No Token Provided' });

    jwt.verify(token, process.env.JWT_SECRET || 'nexus_super_secret', (err, user) => {
        if (err) return res.status(403).json({ success: false, message: 'Access Denied: Invalid Token' });
        req.user = user;
        next();
    });
};

// ----------------------------------------------------
// MAILER CONFIGURATION
// ----------------------------------------------------
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // TLS
    family: 4,     // Force IPv4 to avoid ENETUNREACH on Render
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    debug: true,
    logger: true
});

function formatEmailDate(dateStr) {
    if (!dateStr) return '';
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    let d, m, y;
    if (dateStr.includes('/')) {
        [d, m, y] = dateStr.split('/');
    } else if (dateStr.includes('-')) {
        const bits = dateStr.split('-');
        if(bits.length === 3) { [y, m, d] = bits; } else { return dateStr; }
    } else {
        return dateStr;
    }
    const monthName = months[parseInt(m) - 1];
    if(!monthName) return dateStr;
    return `${monthName} ${parseInt(d)}, ${y}`;
}

const sendConfirmationEmail = async (ticket, event) => {
    try {
        if(!process.env.EMAIL_USER) return console.log('EMAIL_USER empty! Skipping mock email sequence.');
        
        const publicUrl = process.env.PUBLIC_URL || 'http://localhost:3000';
        const verifyLink = `${publicUrl}/validate?ticket=${ticket.ticketId}`;
        const qrCodeDataUrl = await QRCode.toDataURL(verifyLink, {
            color: { dark: '#000000', light: '#ffffff' },
            width: 250,
            margin: 2
        });
        const base64Data = qrCodeDataUrl.split(',')[1];
        
        const mailOptions = {
            from: process.env.EMAIL_USER || '"Nexus Events" <no-reply@nexusevents.com>',
            to: ticket.customerEmail,
            subject: `Your Ticket: ${event.name}`,
            html: `
                <div style="font-family: Arial, sans-serif; background: #0B0C10; color: #C5C6C7; padding: 40px;">
                    <div style="max-width: 600px; margin: 0 auto; background: #1F2833; padding: 30px; border-radius: 10px; border-top: 4px solid #66FCF1;">
                        <h2 style="color: #ffffff; text-align: center;">Ticket Confirmed!</h2>
                        <p>Hi ${ticket.customerName},</p>
                        <p>Your payment was successful and you are fully registered for <strong>${event.name}</strong>.</p>
                        <div style="background: #0B0C10; padding: 20px; border-radius: 8px; border: 1px solid #45A29E; text-align: center; margin: 30px 0;">
                            <p style="color: #45A29E; font-size: 12px; text-transform: uppercase;">Your Unique Entry Pass</p>
                            <h1 style="color: #66FCF1; margin: 0; font-family: monospace;">${ticket.ticketId}</h1>
                            <div style="margin-top: 20px;">
                                <img src="cid:ticket_qrcode" alt="QR Code" style="border-radius: 6px; box-shadow: 0 0 10px rgba(102, 252, 241, 0.2); border: 2px solid #66FCF1; width: 150px; height: 150px;">
                            </div>
                        </div>
                        </div>
                        <p><strong>Date:</strong> ${formatEmailDate(event.date)} at ${event.time}</p>
                        <p><strong>Location:</strong> ${event.location}</p>
                        <hr style="border-color: #ffffff10; margin: 30px 0;">
                        <p style="font-size: 12px; color: #888; text-align: center;">Present your QR code at the entrance for scanning. Enjoy the experience!</p>
                    </div>
                </div>
            `,
            attachments: [
                {
                    filename: 'ticket-qr.png',
                    content: base64Data,
                    encoding: 'base64',
                    cid: 'ticket_qrcode'
                }
            ]
        };
        await transporter.sendMail(mailOptions);
        console.log(`Confirmation email instantly dispatched to ${ticket.customerEmail} with attached QR Code`);
    } catch (err) {
        console.error("Critical Email Error Logic Detected:");
        if (err.code === 'EAUTH') console.error(" - Authentication Failed! Check your EMAIL_USER/EMAIL_PASS (Use App Passwords).");
        if (err.code === 'ECONNREFUSED') console.error(" - Connection refused by SMTP server. Check port settings.");
        console.error(" - Full Details:", err.message);
    }
};

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// Diagnostic Email Test Route (Temporarily Unauthenticated for Debugging)
app.get('/api/admin/test-email', async (req, res) => {
    console.log("--- START: Diagnostic Email Test ---");
    console.log("Environment Check:");
    console.log("- EMAIL_USER present:", !!process.env.EMAIL_USER);
    console.log("- EMAIL_PASS present:", !!process.env.EMAIL_PASS);
    
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            return res.status(400).json({ 
                error: 'Email environment variables missing',
                user: !!process.env.EMAIL_USER,
                pass: !!process.env.EMAIL_PASS
            });
        }
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Send to self
            subject: 'Nexus Diagnostic: SMTP Test',
            text: 'If you are reading this, your SMTP configuration is working correctly!'
        };
        
        console.log("Attempting to send mail...");
        await transporter.sendMail(mailOptions);
        console.log("--- SUCCESS: Diagnostic Email Test ---");
        res.json({ success: true, message: 'Test email successfully dispatched' });
    } catch (err) {
        console.error("--- FAILED: Diagnostic Email Test ---");
        console.error("Error Details:", err);
        res.status(500).json({ success: false, error: err.message, code: err.code });
    }
});

// 0. Auth Login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS || 'nexus2026';

    if (username === adminUser && password === adminPass) {
        const token = jwt.sign({ username }, process.env.JWT_SECRET || 'nexus_super_secret', { expiresIn: '24h' });
        return res.json({ success: true, token });
    }
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// Get all events
app.get('/api/events', async (req, res) => {
    try {
        const events = await Event.find({});
        res.json(events);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

//  Get singlew event by slug
app.get('/api/events/:slug', async (req, res) => {
    try {
        const event = await Event.findOne({ slug: req.params.slug });
        if (!event) return res.status(404).json({ error: 'Event not found' });
        res.json(event);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// Initialize Paystack Transaction
app.post('/api/payment/initialize', async (req, res) => {
    try {
        const { email, name, eventId } = req.body;

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ error: 'Event not found' });

        if (event.soldTickets >= event.capacity) {
            return res.status(400).json({ error: 'Event is sold out' });
        }

        const amountInKobo = event.price;
        
        // Generate a random reference
        const reference = 'NXS_' + Math.floor(Math.random() * 1000000000) + '_' + Date.now();

        // Save a Pending Ticket
        const pendingTicket = new Ticket({
            eventId: event._id,
            customerName: name,
            customerEmail: email,
            reference: reference,
            status: 'PENDING'
        });
        await pendingTicket.save();

        const publicUrl = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
        
        // Call Paystack
        const response = await axios.post(
            'https://api.paystack.co/transaction/initialize',
            {
                email: email,
                amount: amountInKobo,
                reference: reference,
                currency: 'NGN',
                callback_url: `${publicUrl}/callback`,
                metadata: {
                    event_id: event._id,
                    customer_name: name
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json({
            authorization_url: response.data.data.authorization_url,
            access_code: response.data.data.access_code,
            reference: reference
        });

    } catch (err) {
        console.error('Paystack initialization error:', err.response?.data || err.message);
        res.status(500).json({ error: 'Could not initialize payment' });
    }
});

// Verify Payment
app.get('/api/payment/verify/:reference', async (req, res) => {
    try {
        const { reference } = req.params;

        // Verify with Paystack API
        const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET}`
                }
            }
        );

        const data = response.data.data;

        if (data.status === 'success') {
            // Find our pending ticket
            const ticket = await Ticket.findOne({ reference });
            if (!ticket) return res.status(404).json({ error: 'Ticket record not found' });

            if (ticket.status === 'PENDING') {
                ticket.amountPaid = data.amount;
                ticket.status = 'PAID';
                ticket.ticketId = 'TKT-' + Math.random().toString(36).substr(2, 6).toUpperCase();
                await ticket.save();

                // Increment event soldTickets
                const event = await Event.findByIdAndUpdate(
                    ticket.eventId,
                    { $inc: { soldTickets: 1 } },
                    { returnDocument: 'after' }
                );
                
                // Dispatched in background (non-blocking) for instant ticket generation
                sendConfirmationEmail(ticket, event).catch(err => console.error("Background Email Failed:", err.message));
            }

            // Fetch the event to return to frontend
            const eventFallback = await Event.findById(ticket.eventId);

            return res.json({
                success: true,
                ticket: ticket,
                event: eventFallback
            });
        }

        res.status(400).json({ success: false, message: 'Payment not successful' });

    } catch (err) {
        console.error('Verification error:', err.response?.data || err.message);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Paystack Webhook
app.post('/api/webhooks/paystack', async (req, res) => {
    try {
        const hash = crypto.createHmac('sha512', PAYSTACK_SECRET).update(JSON.stringify(req.body)).digest('hex');
        
        if (hash === req.headers['x-paystack-signature']) {
            const eventData = req.body;
            
            if (eventData.event === 'charge.success') {
                const reference = eventData.data.reference;
                const ticket = await Ticket.findOne({ reference });
                
                if (ticket && ticket.status === 'PENDING') {
                    ticket.amountPaid = eventData.data.amount;
                    ticket.status = 'PAID';
                    ticket.ticketId = 'TKT-' + Math.random().toString(36).substr(2, 6).toUpperCase();
                    await ticket.save();
                    const event = await Event.findByIdAndUpdate(ticket.eventId, { $inc: { soldTickets: 1 } }, { new: true });
                    
                    await sendConfirmationEmail(ticket, event);
                }
            }
        }
        res.sendStatus(200);
    } catch (err) {
        console.error('Webhook error:', err);
        res.sendStatus(500);
    }
});

// Get Admins Attendees/Tickets List
app.get('/api/admin/tickets', authenticateAdmin, async (req, res) => {
    try {
        const tickets = await Ticket.find({}).sort({ createdAt: -1 });
        const events = await Event.find({});
        
        const enhancedTickets = tickets.map(t => {
             const matchingEvent = events.find(e => e._id.toString() === t.eventId.toString());
             return {
                 ...t._doc,
                 eventName: matchingEvent ? matchingEvent.name : 'Unknown Event'
             };
        });
        res.json(enhancedTickets);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// Verify Ticket 
app.post('/api/admin/verify-ticket', authenticateAdmin, async (req, res) => {
    try {
        const { ticketId } = req.body;
        const ticket = await Ticket.findOne({ ticketId });
        
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });
        if (ticket.status === 'PENDING') return res.status(400).json({ success: false, message: 'Ticket payment not completed.' });
        if (ticket.status === 'USED') return res.status(400).json({ success: false, message: 'Ticket has already been used!' });
        
        const event = await Event.findById(ticket.eventId);
        res.json({ success: true, ticket, eventName: event ? event.name : 'Unknown' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// Admit Ticket
app.post('/api/admin/admit-ticket', authenticateAdmin, async (req, res) => {
    try {
        const { ticketId } = req.body;
        const ticket = await Ticket.findOne({ ticketId });
        
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });
        if (ticket.status === 'PENDING') return res.status(400).json({ success: false, message: 'Ticket payment not completed.' });
        if (ticket.status === 'USED') return res.status(400).json({ success: false, message: 'Ticket has already been used!' });
        
        ticket.status = 'USED';
        await ticket.save();
        
        res.json({ success: true, message: 'Ticket validated and checked in successfully!', ticket });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// Admin Global Stats
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
    try {
        const events = await Event.find({});
        const activeTickets = await Ticket.find({ status: { $in: ['PAID', 'USED'] }});
        
        let totalRevenue = 0;
        const revenueByEvent = {};

        activeTickets.forEach(t => {
            const amt = t.amountPaid || 0;
            totalRevenue += amt;
            revenueByEvent[t.eventId] = (revenueByEvent[t.eventId] || 0) + amt;
        });

        let chartLabels = [];
        let chartData = [];

        events.forEach(ev => {
            chartLabels.push(ev.name);
            const evRev = revenueByEvent[ev._id] || (ev.soldTickets * ev.price);
            chartData.push(evRev);
        });

        res.json({
            totalRevenue,
            totalTickets: activeTickets.length,
            activeEvents: events.length,
            chartData: {
                labels: chartLabels,
                revenue: chartData
            },
            revenueByEvent
        });
    } catch (err) {
        res.status(500).json({ error: 'Stats error' });
    }
});

// Add new Event
app.post('/api/admin/events', authenticateAdmin, async (req, res) => {
    try {
        const data = req.body;

        const errors = [];
        if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 3) errors.push("Valid name (min 3 chars) is required.");
        
        if (!data.date || typeof data.date !== 'string') {
            errors.push("Event date is required.");
        } else {
            const eventDate = new Date(data.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (isNaN(eventDate.getTime())) {
                errors.push("Invalid date format.");
            } else if (eventDate < today) {
                errors.push("Event date cannot be in the past.");
            }
        }

        if (!data.time || typeof data.time !== 'string') errors.push("Event time is required.");
        if (!data.location || typeof data.location !== 'string') errors.push("Location is required.");
        if (typeof data.price !== 'number' || data.price < 0) errors.push("Price must be a definitive positive number.");
        if (typeof data.capacity !== 'number' || data.capacity < 1) errors.push("Capacity must be at least 1.");
        if (!data.description || typeof data.description !== 'string' || data.description.trim().length < 10) errors.push("A description of at least 10 characters is required.");
        
        if (errors.length > 0) return res.status(400).json({ success: false, message: 'Validation Failed', errors });

        data.name = data.name.trim();
        data.location = data.location.trim();
        data.description = data.description.trim();
        data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        
        const newEvent = new Event(data);
        await newEvent.save();
        res.json({ success: true, event: newEvent });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Update Event
app.put('/api/admin/events/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        
        // Strict Backend Validation
        const errors = [];
        if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 3) errors.push("Valid name (min 3 chars) is required.");
        
        // Date validation: not in the past
        if (!data.date || typeof data.date !== 'string') {
            errors.push("Event date is required.");
        } else {
            const eventDate = new Date(data.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (isNaN(eventDate.getTime())) {
                errors.push("Invalid date format.");
            } else if (eventDate < today) {
                errors.push("Event date cannot be in the past.");
            }
        }

        if (!data.time || typeof data.time !== 'string') errors.push("Event time is required.");
        if (!data.location || typeof data.location !== 'string') errors.push("Location is required.");
        if (typeof data.price !== 'number' || data.price < 0) errors.push("Price must be a definitive positive number.");
        if (typeof data.capacity !== 'number' || data.capacity < 1) errors.push("Capacity must be at least 1.");
        if (!data.description || typeof data.description !== 'string' || data.description.trim().length < 10) errors.push("A description of at least 10 characters is required.");
        
        if (errors.length > 0) return res.status(400).json({ success: false, message: 'Validation Failed', errors });

        data.name = data.name.trim();
        data.location = data.location.trim();
        data.description = data.description.trim();
        data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        
        const event = await Event.findByIdAndUpdate(id, data, { new: true });
        res.json({ success: true, event });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Delete Event
app.delete('/api/admin/events/:id', authenticateAdmin, async (req, res) => {
    try {
        await Event.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Delete error' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Nexus Events Server running on port ${PORT}`);
});
