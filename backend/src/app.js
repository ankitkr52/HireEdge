const express = require('express');
const cookieParser = require('cookie-parser');
const cors=require('cors')
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');


const app = express();
app.set('trust proxy', 1);

 app.use(helmet());
 app.use(express.json());
 app.use(cookieParser())
 const allowedOrigins = (process.env.CORS_ORIGINS || "https://hire-edge-delta.vercel.app,http://localhost:5173")
    .split(",")
    .map(o => o.trim());

 app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true
 }))

// require all the routes here
const authRouter = require('./routes/auth.routes');
const interviewRouter=require('./routes/interview.routes')

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests. Please try again after 15 minutes." }
});

const interviewLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Report generation limit reached. Please try again after 1 hour." }
});

// using all the routes here
app.get('/', (req, res) => res.send("API is working here"))
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/interview', interviewLimiter, interviewRouter);

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
