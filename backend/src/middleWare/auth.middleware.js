const jwt = require("jsonwebtoken")
const tokenBlacklistModel = require("../models/blacklist.model")

async function authUser(req, res, next) {
    try {
        console.log("COOKIES:", req.cookies)

        const token = req.cookies.token

        console.log("TOKEN:", token)

        if (!token) {
            return res.status(401).json({
                message: "Access denied. Please login first."
            })
        }

        const isBlacklisted = await tokenBlacklistModel.findOne({ token })

        if (isBlacklisted) {
            return res.status(401).json({
                message: "Token expired. Please login again."
            })
        }

        const decoded = jwt.verify(token, process.env.jwt_secret)

        console.log("DECODED USER:", decoded)

        req.user = decoded
        next()

    } catch (error) {
        console.error("AUTH ERROR:", error)

        return res.status(401).json({
            message: "Invalid or expired token"
        })
    }
}

module.exports = authUser;