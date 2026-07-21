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

/**
 * @routes get/api/interview/:interviewId
 * @description get a interview report on the basis of interviewId
 * @access private
 */
interviewRouter.get("/report/:interviewId", authMiddleware, interviewController.getInterviewReportByIdController)

/**
 * @routes get/api/interview
 * @description get all interview reports of a user
 * @access private
 */
interviewRouter.get("/", authMiddleware, interviewController.getAllInterviewReportsController)



interviewRouter.post("/resume/pdf/:interviewReportId", authMiddleware, interviewController.generateResumePdfController)


module.exports = interviewRouter