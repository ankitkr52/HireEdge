const express = require('express');  // Fixed typo
const cookieParser = require('cookie-parser'); 
const cors=require('cors')


const app = express();

 app.use(express.json());
 app.use(cookieParser())
 app.use(cors({
    origin:"https://hire-edge-delta.vercel.app/login",
    credentials:true
 }))

// require all the routes here
const authRouter = require('./routes/auth.routes');
const interviewRouter=require('./routes/interview.routes')


// using all the routes here
app.get('/', (req, res) => res.send("API is working here"))
app.use('/api/auth', authRouter);
app.use('/api/interview',interviewRouter)
module.exports = app;
