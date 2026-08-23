const express = require('express');  // Fixed typo
const cookieParser = require('cookie-parser');
const cors=require('cors')
const multer = require('multer');


const app = express();

 app.use(express.json());
 app.use(cookieParser())
 app.use(cors({
    origin:"https://hire-edge-delta.vercel.app",
    credentials:true
 }))

// require all the routes here
const authRouter = require('./routes/auth.routes');
const interviewRouter=require('./routes/interview.routes')


// using all the routes here
app.get('/', (req, res) => res.send("API is working here"))
app.use('/api/auth', authRouter);
app.use('/api/interview',interviewRouter)

app.use((req, res) => {
    res.status(404).json({ success: false, message: "Route not found" });
});

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                success: false,
                message: "File too large. Maximum allowed size is 5MB."
            });
        }
        return res.status(400).json({ success: false, message: err.message });
    }

    console.error("Unhandled error:", err.message);

    res.status(err.statusCode || 500).json({
        success: false,
        message: "Internal server error"
    });
});

module.exports = app;
