const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    eventId: { type: String, required: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    reference: { type: String, required: true, unique: true },
    amountPaid: { type: Number },
    isKobo: { type: Boolean, default: true },
    status: { type: String, enum: ['PENDING', 'PAID', 'USED'], default: 'PENDING' },
    ticketId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);
