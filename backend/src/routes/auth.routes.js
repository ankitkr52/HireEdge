const {Router}=require("express");
const authRouter=Router();
const userModel=require("../models/usermodels")
const authController=require("../controllers/auth.controller")

/**
 * @name POST/api/auth/register
 * @description register a new user
 *  @access Public
 */
    authRouter.post("/register",authController.registerUserController);

/**
 * @name POST/api/auth/login
 * @description login user with email and password
 * @access public
 */

authRouter.post("/login",authController.loginUserController)




module.exports=authRouter;