const { z } = require("zod");

const registerSchema = z.object({
    username: z.string().trim().min(1, "Username is required"),
    email: z.string().trim().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters")
});

const loginSchema = z.object({
    email: z.string().trim().email("Invalid email format"),
    password: z.string().min(1, "Password is required")
});

module.exports = { registerSchema, loginSchema };
