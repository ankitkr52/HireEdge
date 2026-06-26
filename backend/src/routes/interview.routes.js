const exress=require("express")
const authMiddleware=require('../middleWare/auth.middleware')
const interviewController=require('../controllers/interview.controller')



const interviewRouter=exress.Router()

/**
 * @routes post/api/interview
 * @description generate a new interview report on the basis of user self description,resume pdf and job description
 * @access private
 */


interviewRouter.post('/',authMiddleware.authUser,interviewController.generateInterViewReportController)


module.exports=interviewRouter