import { useContext } from "react" 
import {
    generateInterviewReport,
    generateInterviewReportById as getInterviewReportById,
    getAllInterviewReports,
    generateResumePdf
} from "../services/interview.api"
import { InterviewContext } from "../Interview.context"

export const useInterview = () => {
    const context = useContext(InterviewContext)

    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider")
    }

    const { loading, setLoading, report, setReport, reports, setReports, error, setError } = context

    const generateReport = async ({ resumeFile, selfDescription, jobDescription }) => {
        setError(null)
        setLoading(true)
        try {
            const response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile })
            const nextReport = response?.interviewReport ?? response?.report ?? null
            setReport(nextReport)
            return nextReport
        } catch (error) {
            console.error(error)
            setError(error.response?.data?.message || "Failed to generate report")
            return null
        } finally {
            setLoading(false)
        }

    }

    const getReportById = async (id) => {
        if (!id) return null
        setError(null)
        setLoading(true)
        try {
            const response = await getInterviewReportById(id)
            const nextReport = response?.interviewReport ?? response?.report ?? null
            setReport(nextReport)
            return nextReport
        } catch (error) {
            console.error(error)
            setError(error.response?.data?.message || "Failed to load report")
            return null
        } finally {
            setLoading(false)
        }
    }

    const getReports = async () => {
    setError(null)
    setLoading(true)

    try {
        const response = await getAllInterviewReports()

        const nextReports =
            response?.interviewReports ??
            response?.reports ??
            []

        setReports(nextReports)

        return nextReports

    } catch (error) {
        console.error("Get reports error:", error.message)
        setError(error.response?.data?.message || "Failed to load reports")

        return []
    } finally {
        setLoading(false)
    }
}

    const getResumePdf = async (interviewReportId) => {
        setError(null)
        setLoading(true)
        try {
            const response = await generateResumePdf({ interviewReportId })
            const url = window.URL.createObjectURL(new Blob([response], { type: "application/pdf" }))
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", `resume_${interviewReportId}.pdf`)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)  
            setTimeout(() => window.URL.revokeObjectURL(url), 100);
        } catch (error) {
            console.error(error)
            setError(error.response?.data?.message || "Failed to download resume PDF")
        } finally {
            setLoading(false)
        }
    }

    // ✅ useEffect HATAO — component mein rakho
    // return mein sirf functions aur state

    return { loading, error, report, reports, generateReport, getReportById, getReports, getResumePdf }
}