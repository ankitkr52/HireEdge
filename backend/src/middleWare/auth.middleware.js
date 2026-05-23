const jwt = require("jsonwebtoken")
const tokenBlacklistModel = require("../models/blacklist.model")

async function authUser(req, res, next) {
    try {
        const token = req.cookies.token

        if (!token) {
            return res.status(401).json({ message: "Access denied. Please login first." })
        }

        // ✅ blacklist check
        const isBlacklisted = await tokenBlacklistModel.findOne({ token })
        if (isBlacklisted) {
            return res.status(401).json({ message: "Token expired. Please login again." })
        }

        const decoded = jwt.verify(token, process.env.jwt_secret)
        req.user = decoded
        next()

    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" })
    }
}

module.exports = authUser;