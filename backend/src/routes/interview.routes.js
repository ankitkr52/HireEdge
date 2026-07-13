const express = require("express")
const authMiddleware = require('../middleWare/auth.middleware')
const interviewController = require('../controllers/interview.controller')
const upload = require('../middleWare/file.middleware')


const interviewRouter  = express.Router()

/**
 * @routes post/api/interview
 * @description generate a new interview report on the basis of user self description,resume pdf and job description
 * @access private
 */


interviewRouter.post("/", authMiddleware, upload.single("resume"), interviewController.generateInterViewReportController)



module.exports = interviewRouter