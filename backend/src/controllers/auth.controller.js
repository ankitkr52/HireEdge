const userModel = require("../models/usermodels")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

/**
 * @name registerUserController
 * @description Register a new user,expect username and password in the request body,hash the password before saving to database
 * @access Public
 */

async function registerUserController(req, res) {
    const { username, email, password } = req.body
    if (!username || !email || !password) {
        return res.status(400).json({ message: "Please provide username, email and password" })
    }

    const isUserAlreadyExist = await userModel.findOne({
        $or: [{ username }, { email }]
    })
    if (isUserAlreadyExist) {
        return res.status(400).json({ message: "Account already exists with this username or email" })
    }
    const hash=await bcrypt.hash(password,10)
    const user = await  userModel.create({
        username,
        email,
        password: hash
    })
    
    const token = jwt.sign(
        { id: user._id, username: user.username },
        process.env.jwt_secret,
        { expiresIn: "1d" }
        
    )
    res.cookie("token", token, { httpOnly: true })

    res.status(201).json({message:"user registered successfully ",
        user:{
            id:user._id,
            username:user.username,
            email:user.email
        }
    })
}

/**
 * @name loginUserController
 * @description Login a user,experts username and password in the request body 
 *  @access Public
 */

async function loginUserController(req, res) {
    const {username,password}=req.body
    const user=await userModel.findOne({email:username})
    if(!user){
        return res.status(400).json({message:"invalid username or password"})
    }
}

module.exports = {
    registerUserController
}