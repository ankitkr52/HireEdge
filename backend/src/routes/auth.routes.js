const { Router } = require("express");
const userModel = require("../models/usermodels")
const authController = require("../controllers/auth.controller")
const authMiddleware = require("../middleWare/auth.middleware")
const validate = require("../middleWare/validate.middleware");
const { registerSchema, loginSchema } = require("../validators/auth.validator");


const authRouter = Router();
/**
 * @name POST/api/auth/register
 * @description register a new user
 *  @access Public
 */
authRouter.post("/register", validate(registerSchema), authController.registerUserController);

/**
 * @name POST/api/auth/login
 * @description login user with email and password
 * @access public
 */
authRouter.post("/login", validate(loginSchema), authController.loginUserController)

/**
 * @name POST/api/auth/logout
 * @description clear token  from user cookie and add token to blacklist
 * @access public
 */
authRouter.post("/logout", authController.logoutUserController);

/**
 * @route get/api/auth/get-me
 * @description get the current logged in user details, requires token in cookie for authentication
 * @access private
 */
authRouter.get("/get-me", authMiddleware, authController.getMeController)



module.exports = authRouter;