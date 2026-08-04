require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/database');




// Wait for database connection before starting server
connectDB().catch((error) => {
    console.error('Failed to connect to MongoDB:', error)
})

