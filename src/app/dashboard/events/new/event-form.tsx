"use client";

import { useActionState } from "react";
import { createEvent } from "@/actions/events";
import { useI18n } from "@/components/i18n/i18n-provider";

type Category = { id: string; name: string; slug: string };

export function EventForm({ categories }: { categories: Category[] }) {
  const { t } = useI18n();
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await createEvent(formData);
      return result ?? null;
    },
    null
  );

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
          placeholder={t.dashboard.phTitle}
        />
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
          placeholder={t.dashboard.phShort}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
            placeholder={t.dashboard.phLocation}
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
            placeholder={t.dashboard.phVenue}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
            {t.dashboard.formStart}
          </label>
          <input
            id="startDate"
            name="startDate"
            type="datetime-local"
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500"
          />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
            {t.dashboard.formEnd}
          </label>
          <input
            id="endDate"
            name="endDate"
            type="datetime-local"
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500"
            placeholder="100"
          />
        </div>
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700">
            {t.dashboard.formPrice}
          </label>
          <input
            id="price"
            name="price"
            type="number"
            min={0}
            defaultValue={0}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500"
            placeholder={t.dashboard.phPrice}
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
                <input type="checkbox" name="categoryIds" value={cat.id} className="sr-only" />
                {cat.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 border-t border-gray-200 pt-6">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? t.dashboard.formCreating : t.dashboard.createEvent}
        </button>
        <p className="self-center text-xs text-gray-400">{t.dashboard.formDraftHint}</p>
      </div>
    </form>
  );
}
