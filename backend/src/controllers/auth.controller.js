const userModel = require("../models/usermodels")
const bcrypt=require("bcrypt")
const jwt=require("jsonwebtoken")

await function registerUserController(req, res) {
    const { username, email, password } = req.body
    if (!username || !email || !password) {
        return res.status(400).json({ message="Please provide username, email and password" })
    }

}
const isUserAlreadyExist = await userModel.findOne({
    $or: [{ username }, { email }]
})
if (isUserAlreadyExist) {
    return res.status(400).json({ message: "user already exists with this username or email" })
}
const user=new userModel({
    username,
    email,
    password:hash
})

const token=

module.exports = {
    registerUserController
}