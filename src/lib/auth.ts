import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { authConfig } from "./auth.config";
import { prisma } from "./prisma";

const nextAuth = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!passwordMatch) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});

export const { handlers, signIn, signOut, auth } = nextAuth;

export async function requireAuth(): Promise<{ id: string; email: string; name: string; role: string }> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session!.user as { id: string; email: string; name: string; role: string };
}

/** Home path after login — roles stay in separate workspaces. */
export function homePathForRole(role: string) {
  if (role === "ADMIN") return "/admin";
  if (role === "ORGANIZER") return "/dashboard";
  return "/my";
}

/**
 * Enforce exact role. ORGANIZER and ADMIN are mutually exclusive workspaces:
 * admin → /admin only, organizer → /dashboard only.
 */
export async function requireRole(role: "ORGANIZER" | "ADMIN") {
  const user = await requireAuth();
  if (user.role !== role) {
    redirect(homePathForRole(user.role));
  }
  return user;
}
