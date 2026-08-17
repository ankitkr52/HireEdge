const pdfParse = require('pdf-parse')
const { generateInterviewReport, generateResumePdf } = require('../services/ai.service')
const interviewReportModel = require('../models/interviewReport.model')

async function generateInterViewReportController(req, res) {
    try {
        // ✅ File check
        if (!req.file) {
            return res.status(400).json({ message: "Resume PDF required hai" })
        }

        // ✅ Sahi tarika — seedha function call
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

        const interviewReport = await interviewReportModel.findById(interviewReportId)

        if (!interviewReport) {
            return res.status(404).json({ message: "Interview report not found." })
        }

        if (interviewReport.user?.toString() !== req.user.id?.toString()) {
            return res.status(403).json({ message: "Access denied." })
        }

        const { resume, jobDescription, selfDescription } = interviewReport

        const pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription })

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`,
            "Content-Length": pdfBuffer.length
        })

        res.send(pdfBuffer)

    } catch (error) {
        console.error("PDF Controller Error:", error.message)
        res.status(500).json({ message: "Failed to generate PDF resume" })
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

        const interviewReport = await interviewReportModel.findOne({
            _id: interviewReportId,
            user: req.user.id
        })

        if (!interviewReport) {
            return res.status(404).json({ message: "Report not found." })
        }

        res.status(200).json({
            message: "Interview report fetched successfully.",
            interviewReport
        })
    } catch (error) {
        res.status(500).json({ message: "Internal server error" })
    }
}

module.exports = {
    generateInterViewReportController,
    generateResumePdfController,
    getAllInterviewReportsController,
    getInterviewReportByIdController
}