"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { homePathForRole, signIn } from "@/lib/auth";
import { registerSchema, loginSchema } from "@/lib/validations/auth";
import { AuthError } from "next-auth";

export async function register(formData: FormData) {
  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const validated = registerSchema.safeParse(raw);
  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  const { name, email, password } = validated.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { error: "Пользователь с таким email уже существует" };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: { name, email, passwordHash },
  });

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/my",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Ошибка при входе после регистрации" };
    }
    throw error;
  }
}

export async function login(formData: FormData) {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const validated = loginSchema.safeParse(raw);
  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  const user = await prisma.user.findUnique({
    where: { email: raw.email },
    select: { role: true, passwordHash: true },
  });

  if (!user) {
    return { error: "Неверный email или пароль" };
  }

  const passwordMatch = await bcrypt.compare(raw.password, user.passwordHash);
  if (!passwordMatch) {
    return { error: "Неверный email или пароль" };
  }

  try {
    await signIn("credentials", {
      email: raw.email,
      password: raw.password,
      redirectTo: homePathForRole(user.role),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Неверный email или пароль" };
    }
    throw error;
  }
}
