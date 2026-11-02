import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("email"));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "password"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "nameShort"),
    email: emailSchema,
    password: z.string().min(8, "passwordShort"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "passwordMismatch",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
