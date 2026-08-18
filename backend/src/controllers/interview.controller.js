const pdfParse = require('pdf-parse')
const { generateInterviewReport, generateResumePdf } = require('../services/ai.service')
const interviewReportModel = require('../models/interviewReport.model')

async function generateInterViewReportController(req, res) {
    try {
       
        if (!req.file) {
            return res.status(400).json({ message: "Resume PDF required hai" })
        }

        
        const pdfData = await pdfParse(req.file.buffer)
        const resumeText = pdfData.text

        const { selfDescription, jobDescription } = req.body

        if (!jobDescription) {
            return res.status(400).json({ message: "Job description required hai" })
        }

        const interViewReportByAi = await generateInterviewReport({
            resume: resumeText,
            selfDescription: selfDescription || "",
            jobDescription
        })

        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume: resumeText,
            selfDescription: selfDescription || "",
            jobDescription,
            title:               interViewReportByAi.title,
            matchScore:          interViewReportByAi.matchScore,
            technicalQuestions:  interViewReportByAi.technicalQuestions,
            behavioralQuestions: interViewReportByAi.behavioralQuestions,
            skillGaps:           interViewReportByAi.skillGaps,
            preparationPlan:     interViewReportByAi.preparationPlan,
            status: "completed"
        })

        res.status(201).json({
            success: true,
            message: "Interview report generated successfully.",
            interviewReport
        })

    } catch (error) {
        console.error("Controller Error:", error.message)
        res.status(500).json({ message: "Internal server error" })
    }
}

async function generateResumePdfController(req, res) {
    try {
        const { interviewReportId } = req.params

        console.log("1. REPORT ID:", interviewReportId)
        console.log("2. CURRENT USER:", req.user?.id)

        const interviewReport =
            await interviewReportModel.findById(interviewReportId)

        console.log("3. REPORT FOUND:", !!interviewReport)

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            })
        }

        console.log("4. REPORT USER:", interviewReport.user?.toString())
        console.log("5. REQUEST USER:", req.user.id?.toString())

        if (
            interviewReport.user?.toString() !==
            req.user.id?.toString()
        ) {
            return res.status(403).json({
                message: "Access denied."
            })
        }

        const {
            resume,
            jobDescription,
            selfDescription
        } = interviewReport

        console.log("6. RESUME EXISTS:", !!resume)
        console.log("7. RESUME LENGTH:", resume?.length)
        console.log("8. JOB DESCRIPTION EXISTS:", !!jobDescription)
        console.log("9. SELF DESCRIPTION EXISTS:", !!selfDescription)

        console.log("10. Calling generateResumePdf...")

        const pdfBuffer = await generateResumePdf({
            resume,
            jobDescription,
            selfDescription
        })

        console.log("11. PDF GENERATED")
        console.log("12. PDF BUFFER:", !!pdfBuffer)
        console.log("13. PDF BUFFER LENGTH:", pdfBuffer?.length)

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition":
                `attachment; filename=resume_${interviewReportId}.pdf`,
            "Content-Length": pdfBuffer.length
        })

        res.send(pdfBuffer)

    } catch (error) {

        console.error("========== PDF ERROR ==========")
        console.error("MESSAGE:", error.message)
        console.error("STACK:", error.stack)
        console.error("FULL ERROR:", error)
        console.error("================================")

        res.status(500).json({
            message: "Failed to generate PDF resume",
            error: error.message
        })
    }
}

async function getAllInterviewReportsController(req, res) {
    try {
        const interviewReports = await interviewReportModel
            .find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

        res.status(200).json({
            message: "Interview reports fetched successfully.",
            interviewReports
        })
    } catch (error) {
        res.status(500).json({ message: "Internal server error" })
    }
}

async function getInterviewReportByIdController(req, res) {
    try {
        const { interviewReportId } = req.params

        console.log("INTERVIEW REPORT ID:", interviewReportId)
        console.log("CURRENT USER ID:", req.user.id)

        const interviewReport = await interviewReportModel.findOne({
            _id: interviewReportId,
            user: req.user.id
        })

        console.log("FOUND REPORT:", interviewReport)

        if (!interviewReport) {
            return res.status(404).json({
                message: "Report not found."
            })
        }

        res.status(200).json({
            message: "Interview report fetched successfully.",
            interviewReport
        })

    } catch (error) {
        console.error("GET REPORT BY ID ERROR:", error)

        res.status(500).json({
            message: "Internal server error"
        })
    }
}

module.exports = {
    generateInterViewReportController,
    generateResumePdfController,
    getAllInterviewReportsController,
    getInterviewReportByIdController
}