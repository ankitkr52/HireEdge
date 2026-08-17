const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const puppeteer = require('puppeteer')

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})

// ── Interview Report Schema ───────────────────────────────────────────────────
const geminiResponseSchema = {
    type: "object",
    properties: {
        title: { type: "string" },
        matchScore: { type: "integer" },
        technicalQuestions: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    question:  { type: "string" },
                    intention: { type: "string" },
                    answer:    { type: "string" }
                },
                required: ["question", "intention", "answer"]
            }
        },
        behavioralQuestions: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    question:  { type: "string" },
                    intention: { type: "string" },
                    answer:    { type: "string" }
                },
                required: ["question", "intention", "answer"]
            }
        },
        skillGaps: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    skill:    { type: "string" },
                    severity: { type: "string", enum: ["low", "medium", "high"] }
                },
                required: ["skill", "severity"]
            }
        },
        preparationPlan: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    day:   { type: "integer" },
                    focus: { type: "string" },
                    tasks: { type: "array", items: { type: "string" } }
                },
                required: ["day", "focus", "tasks"]
            }
        }
    },
    required: [
        "title", "matchScore", "technicalQuestions",
        "behavioralQuestions", "skillGaps", "preparationPlan"
    ]
}

// ── PDF Schema ────────────────────────────────────────────────────────────────
const resumePdfSchema = {
    type: "object",
    properties: {
        html: {
            type: "string",
            description: "Complete HTML content of the ATS-friendly resume"
        }
    },
    required: ["html"]
}

// ── PDF Generator ─────────────────────────────────────────────────────────────
async function generatePdfFromHtml(htmlContent) {
    let browser = null
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        })
        const page = await browser.newPage()
        await page.setContent(htmlContent, { waitUntil: "networkidle0" })
        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
                top:    "20mm",
                bottom: "20mm",
                left:   "15mm",
                right:  "15mm"
            }
        })
        return pdfBuffer
    } catch (error) {
        console.error("Puppeteer error:", error.message)
        throw error
    } finally {
        if (browser) await browser.close()
    }
}

// ── Interview Report Generator ────────────────────────────────────────────────
async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
    try {
        console.log("=== AI SERVICE CALLED ===")

        const prompt = `You are an expert interview preparation assistant.
Analyze the candidate profile against the job description and generate a complete interview report.

Resume: ${resume}
Self Description: ${selfDescription}
Job Description: ${jobDescription}

REQUIREMENTS:
- technicalQuestions: minimum 5 items, each with question, intention, answer
- behavioralQuestions: minimum 3 items, each with question, intention, answer
- skillGaps: minimum 3 items, each with skill and severity (low/medium/high)
- preparationPlan: minimum 7 days, each with day number, focus, and 3+ tasks
- Do NOT return empty arrays
- Return ONLY valid JSON`

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: geminiResponseSchema,
                maxOutputTokens: 8192,
                temperature: 0.2
            }
        })

        if (!response || !response.text) {
            throw new Error('AI returned empty result')
        }

        const result = JSON.parse(response.text)

        console.log("=== RESULT KEYS ===", Object.keys(result))
        console.log("technicalQuestions:", result.technicalQuestions?.length)
        console.log("behavioralQuestions:", result.behavioralQuestions?.length)
        console.log("skillGaps:", result.skillGaps?.length)
        console.log("preparationPlan:", result.preparationPlan?.length)

        return result

    } catch (error) {
        console.error("=== AI SERVICE ERROR ===", error.message)
        throw error
    }
}

// ── Resume PDF Generator ──────────────────────────────────────────────────────
async function generateResumePdf({ resume, selfDescription, jobDescription }) {
    try {
        const prompt = `You are an expert resume writer and career coach with 10+ years of experience helping candidates land jobs at top companies.

Your task is to generate a professional, ATS-optimized resume in pure HTML format.

CANDIDATE DATA:
Resume/Experience: ${resume}
Self Description: ${selfDescription}
Target Job Description: ${jobDescription}

STRICT REQUIREMENTS:
1. CONTENT RULES:
   - Tailor every bullet point specifically to the target job description
   - Use strong action verbs (Built, Engineered, Designed, Implemented, Optimized)
   - Add quantifiable achievements wherever possible
   - Write in a natural human tone — must NOT sound AI-generated
   - Only include information provided — do NOT hallucinate any details
   - Keep it concise — 1 page preferred, maximum 2 pages

2. ATS OPTIMIZATION:
   - Use standard section headings: Summary, Experience, Skills, Education, Projects
   - Include keywords from the job description naturally
   - Avoid tables, columns, headers/footers, images

3. HTML & DESIGN RULES:
   - Return a COMPLETE, self-contained HTML document with all CSS inline or in style tag
   - Use a clean, minimal design with ample whitespace
   - Font: Inter, Roboto, or system-ui
   - Accent color: one subtle color only
   - Margins: 15mm on all sides — optimized for A4 PDF
   - DO NOT use flexbox columns or grid layouts
   - All content must flow top-to-bottom in a single column

4. STRUCTURE:
   - Header: Full name, contact info
   - Professional Summary: 2-3 lines
   - Technical Skills: grouped by category
   - Work Experience / Projects: reverse chronological
   - Education

5. RESPONSE FORMAT:
   - Return ONLY a valid JSON: { "html": "..." }
   - No markdown, no explanation outside JSON`

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: resumePdfSchema,
                maxOutputTokens: 8192,
                temperature: 0.2
            }
        })

        if (!response || !response.text) {
            throw new Error('AI returned empty response')
        }

        const jsonContent = JSON.parse(response.text)

        if (!jsonContent.html) {
            throw new Error("AI did not return HTML content")
        }

        console.log("HTML generated — length:", jsonContent.html.length)

        const pdfBuffer = await generatePdfFromHtml(jsonContent.html)
        return pdfBuffer

    } catch (error) {
        console.error("generateResumePdf error:", error.message)
        throw error
    }
}

module.exports = { generateInterviewReport, generateResumePdf }