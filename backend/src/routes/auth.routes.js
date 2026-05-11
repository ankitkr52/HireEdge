const {Router}=require("express");
const authRouter=Router();
const userModel=require("../models/usermodels")
const authController=require("../controllers/auth.controller")

/**
 * @name registerUserController
 * @description Register a new user,expect username and password in the request body,hash the password before saving to database
 * @access Public
 */
authRouter.post("/register",authController.registerUserController);




module.exports=authRouter;