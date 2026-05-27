const mongoose = require('mongoose')



/**
 *
 * -job description schema:string
 * -resume text:string
 * -self description:string
 * 
 * -matchScore:number
 * 
 * technical question:[{
 *        question:"",
 *        intention:"",
 *        answer:"",
 *  }]
 * Behavior question:[{
 *       question:"",
 *        intention:"",
 *        answer:"",
 *  }]
 * skills gaps:[{
 *     skills:"",
 *     severity:{
 *    type:"string",
 * enum:["low","medium,high"]
 * }
 * }]
 * prepration gaps:[{
 *   day:number,
 * focus:string,
 * tasks:[string]
 * }]
 * 
 */



const technicalquestionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [true, "Technical question is required "]
    },
    intention: {
        type: String,
        required: [true, "Intention is required"]
    },
    answer: {
        type: String,
        required: [true, "Answer is required"]
    },

}, {
    _id: false
})

const behaviorlQuestionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [true, "Technical question is required "]
    },
    intention: {
        type: String,
        required: [true, "Intention is required"]
    },
    answer: {
        type: String,
        required: [true, "Answer is required"]
    },

}, {
    _id: false
})

const skillGapSchema = new mongoose.Schema({
    skill: {
        type: String,
        required: [true, 'Skill is required']
    },
    severity: {
        type: String,
        enum: ["low", "medium", "high"],
        required: [true, 'Severity is required']
    }
}, {
    _id: false
})


const preprationPlanSchema = new mongoose.Schema({
    day: {
        type: Number,
        required: [true, "Day is required"]
    },
    focus: {
        type: String,
        required: [true, "Focus is required"]
    },
    tasks: [{
        type: String,
        required: [true,"Tasks is required"]
    }]
},{
    _id: false
})


const interviewReportSchema = new mongoose.Schema({

    jobDescription: {
        type: String,
        required: [true, "Job description required"]
    },
    resume: {
        type: String,
    },
    matchScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },

    technicalQuestions: [technicalquestionSchema],
    behaviorQuestions: [behaviorlQuestionSchema],
    skillGaps: [skillGapSchema],
    preprationPlan: [preprationPlanSchema]
},{
    timestamps: true
})