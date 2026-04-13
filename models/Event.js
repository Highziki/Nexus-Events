const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, unique: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    location: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    capacity: { type: Number, required: true },
    soldTickets: { type: Number, default: 0 },
    isKobo: { type: Boolean, default: true }
});

module.exports = mongoose.model('Event', eventSchema);
