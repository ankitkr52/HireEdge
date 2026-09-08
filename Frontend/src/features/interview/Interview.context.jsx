import { createContext, useState } from "react";

export const InterviewContext = createContext();

export const InterviewProvider = ({ children }) => {
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState(null);
    const [reports, setReports] = useState([]);
    const [error, setError] = useState(null);
    const [pdfError, setPdfError] = useState(null);

    return (
        <InterviewContext.Provider value={{ loading, setLoading, report, setReport, reports, setReports, error, setError, pdfError, setPdfError }}>
            {children}
        </InterviewContext.Provider>
    );
};