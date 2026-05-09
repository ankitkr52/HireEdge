require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/database');

// Wait for database connection before starting server
connectDB().then(() => {
    app.listen(3000, () => {
        console.log('Server is running on port 3000');
    });
}).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});