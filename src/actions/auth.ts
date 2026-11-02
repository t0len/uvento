"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { homePathForRole, requireAuth, signIn } from "@/lib/auth";
import { registerSchema, loginSchema } from "@/lib/validations/auth";
import { getI18n } from "@/lib/i18n";
import { errorText } from "@/lib/error-text";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";

async function say(code: string) {
  const { t } = await getI18n();
  return errorText(t, code);
}

export async function register(formData: FormData) {
  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const validated = registerSchema.safeParse(raw);
  if (!validated.success) {
    return { error: await say(validated.error.issues[0].message) };
  }

  const { name, email, password } = validated.data;

  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (existingUser) {
    return { error: await say("emailTaken") };
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
      return { error: await say("signInAfterRegister") };
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
    return { error: await say(validated.error.issues[0].message) };
  }

  const { email, password } = validated.data;
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { role: true, passwordHash: true, blocked: true },
  });

  if (!user) {
    return { error: await say("badCredentials") };
  }

  if (user.blocked) {
    return { error: await say("accountBlocked") };
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    return { error: await say("badCredentials") };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: homePathForRole(user.role),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: await say("badCredentials") };
    }
    throw error;
  }
}

export async function updateName(
  _state: { error?: string; success?: boolean } | undefined,
  formData: FormData,
) {
  const user = await requireAuth();
  const name = String(formData.get("name") || "").trim();
  if (name.length < 2) return { error: await say("nameShort") };
  await prisma.user.update({
    where: { id: user.id },
    data: { name },
  });
  revalidatePath("/my", "layout");
  revalidatePath("/my/settings");
  return { success: true as const };
}
