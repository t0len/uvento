import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().min(3, "Название минимум 3 символа").max(200),
  description: z.string().min(10, "Описание минимум 10 символов"),
  shortDescription: z.string().max(300).optional(),
  location: z.string().min(2, "Укажите место проведения"),
  venue: z.string().optional(),
  startDate: z.string().refine((d) => !isNaN(Date.parse(d)), "Некорректная дата начала"),
  endDate: z.string().refine((d) => !isNaN(Date.parse(d)), "Некорректная дата окончания"),
  capacity: z.coerce.number().int().min(1, "Минимум 1 место"),
  price: z.coerce.number().int().min(0, "Цена не может быть отрицательной").default(0),
  categoryIds: z.array(z.string()).optional(),
}).refine((data) => new Date(data.endDate) > new Date(data.startDate), {
  message: "Дата окончания должна быть после даты начала",
  path: ["endDate"],
});

export const updateEventSchema = createEventSchema.partial();

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
