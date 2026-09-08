const { z } = require("zod");

const createInterviewSchema = z.object({
    jobDescription: z.string().trim().min(1, "Job description is required").max(5000, "Job description too long (max 5000 characters)"),
    selfDescription: z.string().trim().max(2000, "Self-description too long (max 2000 characters)").optional().or(z.literal(""))
});

module.exports = { createInterviewSchema };
