const express = require('express');  // Fixed typo

const app = express();
app.use(express.json());

module.exports = app;