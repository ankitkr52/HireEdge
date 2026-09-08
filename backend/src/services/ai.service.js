const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const path = require('path')
const puppeteer = require('puppeteer-core')
const chromiumModule = require('@sparticuz/chromium')
// @sparticuz/chromium@149 ships as pure ESM ("type": "module"); Node's require(esm) interop
// wraps the real API under .default instead of exposing it at the top level like v121 did
const chromium = chromiumModule.default || chromiumModule

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})

async function callGeminiWithRetry(fn, { maxAttempts = 3, baseDelayMs = 1000 } = {}) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            const status = error?.status || error?.code || error?.response?.status;
            const isRetryable = status === 503 || status === 429 || status === 'UNAVAILABLE' || status === 'RESOURCE_EXHAUSTED';

            console.error(`Gemini call attempt ${attempt}/${maxAttempts} failed:`, {
                status,
                code: error?.code,
                message: error?.message,
                details: error?.details
            });

            if (!isRetryable || attempt === maxAttempts) {
                throw error;
            }

            const delay = baseDelayMs * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}

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
        const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'

        if (isProduction) {
            if (typeof chromium.setGraphicsMode === 'function') {
                chromium.setGraphicsMode(false)
            } else {
                // @sparticuz/chromium v149 exposes setGraphicsMode as a static setter, not a method
                try { chromium.setGraphicsMode = false } catch (e) { /* setter-only property; ignore */ }
            }

            const executablePath = await chromium.executablePath()
            const execDir = path.dirname(executablePath)

            // Build the LD_LIBRARY_PATH value — put Chromium's exec dir FIRST so its bundled libs win,
            // then preserve any system paths that may already be present
            const ldLibraryPath = execDir + (process.env.LD_LIBRARY_PATH ? ':' + process.env.LD_LIBRARY_PATH : '')

            // Also set on process.env as a belt-and-suspenders fallback
            process.env.LD_LIBRARY_PATH = ldLibraryPath

            browser = await puppeteer.launch({
                args: chromium.args,
                // defaultViewport/headless were removed from @sparticuz/chromium's API in v149;
                // the bundled binary is headless-only, so headless: true is the direct equivalent
                headless: true,
                executablePath,
                // CRITICAL: pass env explicitly so LD_LIBRARY_PATH is guaranteed to reach the child process.
                // Merging with process.env preserves everything else the browser might need.
                env: {
                    ...process.env,
                    LD_LIBRARY_PATH: ldLibraryPath,
                },
            })
        } else {
            browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                // For local dev: uses whatever puppeteer-core can find, OR user's local Chrome
                // If local dev breaks after this change, user can install regular puppeteer as devDep
                // and set executablePath via env var CHROME_PATH
                executablePath: process.env.CHROME_PATH || undefined,
            })
        }
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

        const response = await callGeminiWithRetry(() =>
            ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: geminiResponseSchema,
                    maxOutputTokens: 8192,
                    temperature: 0.2
                }
            })
        )

        if (!response || !response.text) {
            throw new Error('AI returned empty result')
        }

        const result = JSON.parse(response.text)

       

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

        const response = await callGeminiWithRetry(() =>
            ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: resumePdfSchema,
                    maxOutputTokens: 8192,
                    temperature: 0.2
                }
            })
        )

        if (!response || !response.text) {
            throw new Error('AI returned empty response')
        }

        const jsonContent = JSON.parse(response.text)

        if (!jsonContent.html) {
            throw new Error("AI did not return HTML content")
        }

        const pdfBuffer = await generatePdfFromHtml(jsonContent.html)
        return pdfBuffer

    } catch (error) {
        console.error("generateResumePdf error:", error.message)
        throw error
    }
}

module.exports = { generateInterviewReport, generateResumePdf }