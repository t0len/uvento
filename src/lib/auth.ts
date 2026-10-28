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

        const email = String(credentials.email).trim().toLowerCase();
        const user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
        });

        if (!user) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!passwordMatch || user.blocked) return null;

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

export type AuthUser = { id: string; email: string; name: string; role: string };

export async function currentUser(): Promise<AuthUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const row = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true, blocked: true },
  });
  if (!row || row.blocked) {
    await signOut({ redirectTo: "/login" });
    redirect("/login");
  }
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
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
