const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})

// ✅ Zod — sirf VALIDATION ke liye (rakho isse)
const interviewReportZodSchema = z.object({
    title: z.string().min(1),
    matchScore: z.number().int().min(0).max(100),
    technicalQuestions: z.array(z.object({
        question:  z.string(),
        intention: z.string(),
        answer:    z.string()
    })).min(5),
    behavioralQuestions: z.array(z.object({
        question:  z.string(),
        intention: z.string(),
        answer:    z.string()
    })).min(3),
    skillGaps: z.array(z.object({
        skill:    z.string(),
        severity: z.enum(["low", "medium", "high"])
    })).min(3),
    preparationPlan: z.array(z.object({
        day:   z.number().int(),
        focus: z.string(),
        tasks: z.array(z.string()).min(3)
    })).min(7)
})

// ✅ Gemini — MANUAL schema (zodToJsonSchema hatao — ye problem hai)
const geminiResponseSchema = {
    type: "object",
    properties: {
        title: {
            type: "string",
            description: "Exact job title from the job description"
        },
        matchScore: {
            type: "integer",
            description: "Integer from 0 to 100 showing candidate fit"
        },
        technicalQuestions: {
            type: "array",
            description: "Minimum 5 technical questions as objects",
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
            description: "Minimum 3 behavioral questions as objects",
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
            description: "Minimum 3 skill gaps as objects",
            items: {
                type: "object",
                properties: {
                    skill:    { type: "string" },
                    severity: {
                        type: "string",
                        enum: ["low", "medium", "high"]
                    }
                },
                required: ["skill", "severity"]
            }
        },
        preparationPlan: {
            type: "array",
            description: "Minimum 7 day plan as objects",
            items: {
                type: "object",
                properties: {
                    day:   { type: "integer" },
                    focus: { type: "string" },
                    tasks: {
                        type: "array",
                        items: { type: "string" }
                    }
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

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
    try {

        const prompt = `You are an expert interview preparation assistant.
Analyze the candidate profile against the job description and generate a complete interview report.

Resume: ${resume}
Self Description: ${selfDescription}
Job Description: ${jobDescription}

STRICT REQUIREMENTS:
- technicalQuestions: minimum 5 OBJECTS, each with "question", "intention", "answer" fields
- behavioralQuestions: minimum 3 OBJECTS, each with "question", "intention", "answer" fields
- skillGaps: minimum 3 OBJECTS, each with "skill" and "severity" fields
- preparationPlan: minimum 7 OBJECTS, each with "day", "focus", "tasks" fields
- Do NOT return flat arrays of strings
- Each array item MUST be an object with all required fields
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

      

      
        const validation = interviewReportZodSchema.safeParse(result)
        if (!validation.success) {
            console.error("Zod errors:", JSON.stringify(validation.error.format(), null, 2))
            return result   // ✅ return — never throw
        }

       
        return validation.data

    } catch (error) {
        console.error("=== AI SERVICE ERROR ===", error.message)
        throw error
    }
}

module.exports = generateInterviewReport