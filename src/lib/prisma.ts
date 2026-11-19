import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const RETRYABLE = new Set(["P1001", "P1002", "P1008", "P1017", "P2024"]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createClient() {
  const client = new PrismaClient().$extends({
    query: {
      async $allOperations({ args, query }) {
        let attempt = 0;
        for (;;) {
          try {
            return await query(args);
          } catch (error) {
            const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : "";
            attempt += 1;
            if (!RETRYABLE.has(code) || attempt >= 3) throw error;
            await sleep(250 * attempt);
          }
        }
      },
    },
  });
  return client as unknown as PrismaClient;
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
