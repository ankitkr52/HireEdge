import { useContext } from "react";
import { useParams } from "react-router-dom";
import {
    generateInterviewReport,
    generateInterviewReportById as getInterviewReportById,
    getAllInterviewReports,
} from "../services/interview.api";
import { InterviewContext } from "../Interview.context";

export const useInterview = () => {
    const context = useContext(InterviewContext);
    const { interviewId } = useParams();

    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider");
    }

    const { loading, setLoading, report, setReport, reports, setReports } = context;

    const generateReport = async ({ resumeFile, selfDescription, jobDescription }) => {
        setLoading(true);
        try {
            const response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile });
            const nextReport = response?.interviewReport ?? response?.report ?? null;
            setReport(nextReport);
            return nextReport;
        } catch (error) {
            console.error(error);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const getReportById = async (id = interviewId) => {
        setLoading(true);
        try {
            const response = await getInterviewReportById(id);
            const nextReport = response?.interviewReport ?? response?.report ?? null;
            setReport(nextReport);
            return nextReport;
        } catch (error) {
            console.error(error);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const getReports = async () => {
        setLoading(true);
        try {
            const response = await getAllInterviewReports();
            const nextReports = response?.interviewReports ?? response?.reports ?? [];
            setReports(nextReports);
            return nextReports;
        } catch (error) {
            console.error(error);
            return [];
        } finally {
            setLoading(false);
        }
    };

    const getResumePdf = async (id = interviewId) => {
        if (!id) {
            return null;
        }

        window.open(`/api/interview/report/${id}/pdf`, "_blank", "noopener,noreferrer");
        return null;
    };

    return { loading, report, reports, generateReport, getReportById, getReports, getResumePdf };
};

