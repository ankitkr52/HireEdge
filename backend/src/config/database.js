const mongoose = require('mongoose');



async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        console.log('Connected to MongoDB');
        return true;
    } catch (error) {
        console.error('MongoDB Connection Error:', error.message);
        throw error;
    }
}
module.exports = connectDB;