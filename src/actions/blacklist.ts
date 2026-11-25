"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getI18n } from "@/lib/i18n";
import { errorText } from "@/lib/error-text";
import { normalizeBlockReason } from "@/lib/block-reason";
import { cancelActiveRegistrations } from "@/lib/blacklist";
import { deleteBlockDocument, saveBlockDocument, signedBlockDocumentUrl } from "@/lib/block-documents";
import { revalidatePath } from "next/cache";

async function say(code: string) {
  const { t } = await getI18n();
  return errorText(t, code);
}

async function canManage(actorId: string, role: string, organizationId: string) {
  if (role === "ADMIN") return true;
  if (role !== "ORGANIZER") return false;
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: actorId, organizationId },
    select: { id: true },
  });
  return Boolean(membership);
}

function revalidateBlock(slugs: string[], eventIds: string[]) {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/registrations");
  revalidatePath("/dashboard/blocked");
  revalidatePath("/my/restrictions");
  revalidatePath("/my/tickets");
  for (const slug of slugs) revalidatePath(`/events/${slug}`);
  for (const id of eventIds) revalidatePath(`/dashboard/events/${id}`);
}

async function record(
  action: "BLOCK" | "UNBLOCK",
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const actor = await requireAuth();
  const organizationId = String(formData.get("organizationId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!organizationId || !userId) return { error: await say("userNotFound") };
  if (userId === actor.id) return { error: await say("cannotBlockSelf") };

  const reason = normalizeBlockReason(String(formData.get("reason") ?? ""));
  if ("error" in reason) return { error: await say(reason.error) };

  const allowed = await canManage(actor.id, actor.role, organizationId);
  if (!allowed) return { error: await say("noRights") };

  const subject = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!subject) return { error: await say("userNotFound") };

  const uploaded = formData.get("document");
  const file = uploaded instanceof File && uploaded.size > 0 ? uploaded : null;
  let document: { path: string; name: string } | null = null;
  if (file) {
    const saved = await saveBlockDocument(file, organizationId);
    if (saved.error) return { error: await say(saved.error) };
    if (saved.path && saved.name) document = { path: saved.path, name: saved.name };
  }

  try {
    const outcome = await prisma.$transaction(async (tx): Promise<
      { error: "alreadyBlocked" | "notBlocked" } | { slugs: string[]; eventIds: string[] }
    > => {
      const current = await tx.organizationBlacklist.findUnique({
        where: { organizationId_userId: { organizationId, userId } },
        select: { id: true, active: true },
      });
      if (action === "BLOCK" && current?.active) return { error: "alreadyBlocked" as const };
      if (action === "UNBLOCK" && !current?.active) return { error: "notBlocked" as const };

      const row = current
        ? await tx.organizationBlacklist.update({
            where: { id: current.id },
            data: { active: action === "BLOCK" },
          })
        : await tx.organizationBlacklist.create({
            data: { organizationId, userId, active: true },
          });

      await tx.organizationBlacklistEntry.create({
        data: {
          blacklistId: row.id,
          action,
          reason: reason.reason,
          documentPath: document?.path,
          documentName: document?.name,
          actorId: actor.id,
        },
      });

      const cancelled =
        action === "BLOCK" ? await cancelActiveRegistrations(tx, organizationId, userId) : [];
      return {
        slugs: cancelled.map((registration) => registration.event.slug),
        eventIds: cancelled.map((registration) => registration.eventId),
      };
    });

    if ("error" in outcome) {
      if (document) await deleteBlockDocument(document.path);
      return { error: await say(outcome.error) };
    }

    revalidateBlock(outcome.slugs, outcome.eventIds);
    return { success: true };
  } catch (error) {
    if (document) await deleteBlockDocument(document.path);
    console.error("blacklist", error);
    return { error: await say("bookingFailed") };
  }
}

export async function blockUser(formData: FormData) {
  return record("BLOCK", formData);
}

export async function unblockUser(formData: FormData) {
  return record("UNBLOCK", formData);
}

export async function blockDocumentUrl(entryId: string): Promise<{ url: string } | { error: string }> {
  const user = await requireAuth();
  const entry = await prisma.organizationBlacklistEntry.findUnique({
    where: { id: entryId },
    include: { blacklist: { select: { organizationId: true, userId: true } } },
  });
  if (!entry?.documentPath) return { error: await say("documentMissing") };

  const isSubject = entry.blacklist.userId === user.id;
  const allowed = isSubject || (await canManage(user.id, user.role, entry.blacklist.organizationId));
  if (!allowed) return { error: await say("noRights") };

  const url = await signedBlockDocumentUrl(entry.documentPath);
  if (!url) return { error: await say("documentMissing") };
  return { url };
}
