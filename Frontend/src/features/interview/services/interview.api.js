import axios from "axios";


const api = axios.create({
    baseURL: 'http://localhost:3000',
    withCredentials: true,
})

/**
 * @description Generates an interview report based on the provided files and descriptions.
 
 */
export const generateInterviewReport = async ({ resumeFile, selfDescription, jobDescription }) => {
    const formData = new FormData()
    formData.append('resume', resumeFile)
    formData.append('selfDescription', selfDescription)
    formData.append('jobDescription', jobDescription)

    const response = await api.post('/api/interview', formData, {
        headers:{
            contentType: 'multipart/form-data'
        }
    })
    return response.data

}

/**
 * @description Generates an interview report based on the provided interview ID.
 * @param {string} interviewId - The ID of the interview for which to generate a report.
 * @returns {Promise<any>} - A promise resolving to the generated interview report.
 */
export const generateInterviewReportById = async (interviewId) => {
const response = await api.get(`/api/interview/report/${interviewId}`)
return response.data

}

/**
 * 
 * @descrption service to get all interview report of logged in user
 */

export const getAllInterviewReports = async () => {
    const response = await api.get('/api/interview')
    return response.data
}