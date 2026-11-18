import { z } from "zod";
import { normalizePhone } from "@/lib/person";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("email"));

const phoneSchema = z
  .string()
  .trim()
  .min(1, "phoneInvalid")
  .refine((value) => normalizePhone(value) !== null, { message: "phoneInvalid" });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "password"),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, "nameShort").max(80, "nameLong"),
  lastName: z.string().trim().min(2, "lastNameShort").max(80, "nameLong"),
  phone: phoneSchema,
});

export const registerSchema = profileSchema
  .extend({
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
