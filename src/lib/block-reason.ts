export const BLOCK_REASON_WORD_LIMIT = 250;
const BLOCK_REASON_CHAR_LIMIT = 5000;

export function countWords(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function normalizeBlockReason(value: string): { reason: string } | { error: "blockReasonRequired" | "blockReasonTooLong" } {
  const reason = value.trim();
  const words = countWords(reason);
  if (words === 0) return { error: "blockReasonRequired" };
  if (words > BLOCK_REASON_WORD_LIMIT || reason.length > BLOCK_REASON_CHAR_LIMIT) {
    return { error: "blockReasonTooLong" };
  }
  return { reason };
}

export type BlockHistoryEntry = {
  id: string;
  action: "BLOCK" | "UNBLOCK";
  reason: string;
  documentName: string | null;
  createdAt: string;
  actorName: string;
};
