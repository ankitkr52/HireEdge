const userModel = require("../models/usermodels")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const tokenBlacklistModel = require("../models/blacklist.model")


/**
 * @name registerUserController
 * @description Register a new user,expect username and password in the request body,hash the password before saving to database
 * @access Public
 */

// register user controller code her 
async function registerUserController(req, res) {
    try {
        const { username, email, password } = req.body

        // ✅ validation check
        if (!username || !email || !password) {
            return res.status(400).json({ message: "Please provide username, email and password" })
        }

        // ✅ check existing user
        const isUserAlreadyExist = await userModel.findOne({
            $or: [{ username }, { email }]
        })
        if (isUserAlreadyExist) {
            return res.status(400).json({ message: "Account already exists with this username or email" })
        }

        // ✅ hash password
        const hash = await bcrypt.hash(password, 10)

        const user = await userModel.create({
            username,
            email,
            password: hash
        })

        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.jwt_secret,
            { expiresIn: "1d" }
        )

        res.cookie("token", token, { httpOnly: true })  // ✅ already had this, good

        res.status(201).json({
            message: "User registered successfully",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        })

    } catch (error) {
        // ✅ added try/catch — was missing before
        res.status(500).json({ message: "Internal server error" })
    }
}

/**
 * @name loginUserController
 * @description Login a user,experts username and password in the request body 
 *  @access Public
 */

async function loginUserController(req, res) {
    try {
        const { email, password } = req.body  // ✅ was "username" before

        if (!email || !password) {
            return res.status(400).json({ message: "Please provide email and password" })
        }

        const user = await userModel.findOne({ email })
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" })
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid email or password" })  // ✅ was 404
        }

        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.jwt_secret,
            { expiresIn: "1d" }
        )

        res.cookie("token", token, { httpOnly: true })  

        res.status(200).json({
            message: "User logged in successfully.",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        })
    } catch (error) {
        res.status(500).json({ message: "Internal server error" })  
    }
}

/**
 * 
 * @name logoutUserController
 *@description clear token  from user cookie and add token to blacklist 
 @access Public
 */
async function logoutUserController(req, res) {
    const token = req.cookies.token
    if (token) {
        await tokenBlacklistModel.create({ token })
    }
    res.clearCookie("token")
    res.status(200).json({ message: "User logged out successfully" })
}


/**
 * 
 * @name getMeController
 * @description get the current logged in user details
 * @access private
 */
async function getMeController(req, res) {
    const user = await userModel.findById(req.user.id)

    res.status(200).json({
        message:"User details fetched successfully",
        user: {

            id: user._id,
            username: user.username,
            email: user.email
        }
    })

}

module.exports = {
    registerUserController,
    loginUserController,
    logoutUserController,
    getMeController,
}