const mongoose = require('mongoose');
const Event = require('./models/Event');
const Ticket = require('./models/Ticket');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');
        await runSlugMigration();
        await runKoboMigration();
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

module.exports = connectDB;
