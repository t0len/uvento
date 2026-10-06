"use client";

import { useActionState, useState } from "react";
import { createEvent, updateEvent } from "@/actions/events";
import { useI18n } from "@/components/i18n/i18n-provider";

type Category = { id: string; name: string; slug: string };

export type EventFormValues = {
  title: string;
  description: string;
  shortDescription: string;
  location: string;
  venue: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  price: number;
  categoryIds: string[];
  coverImageUrl: string | null;
};

export function EventForm({
  categories,
  eventId,
  initial,
}: {
  categories: Category[];
  eventId?: string;
  initial?: EventFormValues;
}) {
  const { t } = useI18n();
  const [preview, setPreview] = useState<string | null>(initial?.coverImageUrl ?? null);
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = eventId ? await updateEvent(eventId, formData) : await createEvent(formData);
      return result ?? null;
    },
    null
  );

  function setFile(file: File | undefined) {
    if (!file) {
      setPreview(null);
      return;
    }
    setPreview(URL.createObjectURL(file));
  }

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          {t.dashboard.formTitle}
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500"
          defaultValue={initial?.title}
          placeholder={t.dashboard.phTitle}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">
            {t.dashboard.formDate}
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={initial?.date}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500"
          />
        </div>
        <div>
          <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
            {t.dashboard.formTime}
          </label>
          <input
            id="startTime"
            name="startTime"
            type="time"
            required
            defaultValue={initial?.startTime}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500"
          />
        </div>
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">
            {t.dashboard.formLocation}
          </label>
          <input
            id="location"
            name="location"
            type="text"
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500"
            defaultValue={initial?.location}
            placeholder={t.dashboard.phLocation}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
            {t.dashboard.formEndTime}
          </label>
          <input
            id="endTime"
            name="endTime"
            type="time"
            defaultValue={initial?.endTime}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500"
          />
        </div>
        <div>
          <label htmlFor="venue" className="block text-sm font-medium text-gray-700">
            {t.dashboard.formVenue}
          </label>
          <input
            id="venue"
            name="venue"
            type="text"
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500"
            defaultValue={initial?.venue}
            placeholder={t.dashboard.phVenue}
          />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          {t.dashboard.formDescription}
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={5}
          className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500"
          defaultValue={initial?.description}
          placeholder={t.dashboard.phDescription}
        />
      </div>

      <div>
        <label htmlFor="shortDescription" className="block text-sm font-medium text-gray-700">
          {t.dashboard.formShortDescription}
        </label>
        <input
          id="shortDescription"
          name="shortDescription"
          type="text"
          maxLength={300}
          className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500"
          defaultValue={initial?.shortDescription}
          placeholder={t.dashboard.phShort}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700">
            {t.dashboard.formPrice}
          </label>
          <input
            id="price"
            name="price"
            type="number"
            min={0}
            defaultValue={initial?.price ?? 0}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500"
            placeholder={t.dashboard.phPrice}
          />
        </div>
        <div>
          <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">
            {t.dashboard.formCapacity}
          </label>
          <input
            id="capacity"
            name="capacity"
            type="number"
            required
            min={1}
            defaultValue={initial?.capacity}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500"
            placeholder="100"
          />
        </div>
      </div>

      {categories.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t.dashboard.formCategories}
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <label
                key={cat.id}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-900 transition-colors has-[:checked]:border-gray-900 has-[:checked]:bg-gray-900 has-[:checked]:text-white"
              >
                <input
                  type="checkbox"
                  name="categoryIds"
                  value={cat.id}
                  defaultChecked={initial?.categoryIds.includes(cat.id)}
                  className="sr-only"
                />
                {cat.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="block text-sm font-medium text-gray-700">{t.dashboard.formImage}</p>
        <label
          htmlFor="cover"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files?.[0];
            const input = document.getElementById("cover") as HTMLInputElement | null;
            if (file && input) {
              const transfer = new DataTransfer();
              transfer.items.add(file);
              input.files = transfer.files;
              setFile(file);
            }
          }}
          className="mt-1 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500 hover:border-gray-400"
        >
          {preview ? (
            <img src={preview} alt="" className="mb-3 max-h-40 rounded-lg object-contain" />
          ) : null}
          {t.dashboard.formImageHint}
          <input
            id="cover"
            name="cover"
            type="file"
            accept="image/jpeg,image/png"
            className="sr-only"
            onChange={(event) => setFile(event.target.files?.[0])}
          />
        </label>
      </div>

      <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-6">
        {eventId ? (
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {isPending ? t.dashboard.formCreating : t.dashboard.saveChanges}
          </button>
        ) : (
          <>
            <button
              type="submit"
              name="intent"
              value="draft"
              disabled={isPending}
              className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
            >
              {t.dashboard.saveDraft}
            </button>
            <button
              type="submit"
              name="intent"
              value="publish"
              disabled={isPending}
              className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {isPending ? t.dashboard.formCreating : t.dashboard.publishEvent}
            </button>
          </>
        )}
      </div>
    </form>
  );
}
