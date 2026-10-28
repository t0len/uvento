import type { ParticipationType } from "@prisma/client";

export const PARTICIPATION_TYPES = ["OPEN", "FREE", "PAID"] as const;

export type EventDraftInput = {
  title: string;
  description: string;
  shortDescription?: string;
  location: string;
  venue?: string;
  startDate: Date | null;
  endDate: Date | null;
  capacity: number | null;
  price: number;
  participationType: ParticipationType;
  categoryIds: string[];
};

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function optionalInt(value: string) {
  if (!value) return { value: null as number | null };
  if (!/^\d+$/.test(value)) return { error: "Введите целое число" as const };
  return { value: Number(value) };
}

export function readEventForm(
  formData: FormData,
  startRaw = clean(formData.get("startDate")),
  endRaw = clean(formData.get("endDate")),
): { error: string } | { data: EventDraftInput } {
  const title = clean(formData.get("title"));
  if (title.length < 3) return { error: "Название минимум 3 символа" };
  if (title.length > 200) return { error: "Название слишком длинное" };

  const description = clean(formData.get("description"));
  const shortDescription = clean(formData.get("shortDescription"));
  const location = clean(formData.get("location"));
  const venue = clean(formData.get("venue"));
  if (shortDescription.length > 300) return { error: "Краткое описание длиннее 300 символов" };

  const startDate = startRaw ? new Date(startRaw) : null;
  const endDate = endRaw ? new Date(endRaw) : null;
  if (startRaw && Number.isNaN(startDate?.getTime())) return { error: "Некорректная дата начала" };
  if (endRaw && Number.isNaN(endDate?.getTime())) return { error: "Некорректная дата окончания" };
  if (startDate && endDate && endDate <= startDate) {
    return { error: "Дата окончания должна быть после даты начала" };
  }

  const participationRaw = clean(formData.get("participationType")) || "FREE";
  if (!PARTICIPATION_TYPES.includes(participationRaw as ParticipationType)) {
    return { error: "Выберите тип участия" };
  }
  const participationType = participationRaw as ParticipationType;

  const capacityParsed = optionalInt(clean(formData.get("capacity")));
  if ("error" in capacityParsed) return { error: "Вместимость должна быть целым числом" };
  const priceParsed = optionalInt(clean(formData.get("price")));
  if ("error" in priceParsed) return { error: "Цена должна быть целым числом" };

  const price = participationType === "PAID" ? (priceParsed.value ?? 0) : 0;
  const capacity = participationType === "OPEN" ? null : capacityParsed.value;

  return {
    data: {
      title,
      description,
      shortDescription: shortDescription || undefined,
      location,
      venue: venue || undefined,
      startDate,
      endDate,
      capacity,
      price,
      participationType,
      categoryIds: formData.getAll("categoryIds").map(String).filter(Boolean),
    },
  };
}

export function publishGaps(event: {
  title: string;
  description: string;
  location: string;
  startDate: Date | null;
  endDate: Date | null;
  capacity: number | null;
  price: number;
  participationType: ParticipationType;
}) {
  const gaps: string[] = [];
  if (event.title.trim().length < 3) gaps.push("Название минимум 3 символа");
  if (event.description.trim().length < 10) gaps.push("Описание минимум 10 символов");
  if (event.location.trim().length < 2) gaps.push("Укажите место проведения");
  if (!event.startDate) gaps.push("Укажите дату и время начала");
  if (!event.endDate) gaps.push("Укажите дату и время окончания");
  if (event.startDate && event.endDate && event.endDate <= event.startDate) {
    gaps.push("Дата окончания должна быть после даты начала");
  }
  if (event.participationType !== "OPEN" && (event.capacity == null || event.capacity < 1)) {
    gaps.push("Укажите вместимость");
  }
  if (event.participationType === "PAID" && event.price < 1) {
    gaps.push("Укажите цену билета");
  }
  return gaps;
}
