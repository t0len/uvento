"use client";

import { useActionState, useRef, useState } from "react";
import { createEvent, updateEvent } from "@/actions/events";
import { useI18n } from "@/components/i18n/i18n-provider";
import { compressCover } from "@/lib/compress-cover";

type Category = { id: string; name: string; slug: string };

export type EventFormValues = {
  title: string;
  description: string;
  shortDescription: string;
  location: string;
  venue: string;
  date: string;
  endDate: string;
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
  organizations = [],
}: {
  categories: Category[];
  eventId?: string;
  initial?: EventFormValues;
  organizations?: { id: string; name: string }[];
}) {
  const { t } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  const [preview, setPreview] = useState<string | null>(initial?.coverImageUrl ?? null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const steps = [t.dashboard.stepBasics, t.dashboard.stepPlace, t.dashboard.stepTickets, t.dashboard.stepCover];
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = eventId ? await updateEvent(eventId, formData) : await createEvent(formData);
      return result ?? null;
    },
    null
  );

  function goNext() {
    const panel = formRef.current?.querySelector(`[data-step="${step}"]`);
    const fields = panel?.querySelectorAll("input, textarea, select") ?? [];
    for (const field of fields) {
      if (
        (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) &&
        !field.checkValidity()
      ) {
        field.reportValidity();
        return;
      }
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
    formRef.current?.scrollIntoView({ block: "start" });
  }

  async function applyCover(file: File | undefined) {
    const input = document.getElementById("cover") as HTMLInputElement | null;
    setPreview((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return current;
    });
    if (!file) {
      if (input) input.value = "";
      setPreview(initial?.coverImageUrl ?? null);
      setImageError(null);
      return;
    }
    setCompressing(true);
    try {
      const small = await compressCover(file);
      if (input) {
        const transfer = new DataTransfer();
        transfer.items.add(small);
        input.files = transfer.files;
      }
      setPreview(URL.createObjectURL(small));
      setImageError(null);
    } catch {
      if (input) input.value = "";
      setPreview(initial?.coverImageUrl ?? null);
      setImageError(t.dashboard.imageSize);
    } finally {
      setCompressing(false);
    }
  }

  return (
    <form ref={formRef} action={formAction} className="relative space-y-6">
      {isPending && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/90">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
          <p className="text-sm font-medium text-gray-900">{t.dashboard.formCreating}</p>
        </div>
      )}
      <ol className="grid grid-cols-4 gap-2">
        {steps.map((label, index) => {
          const current = index === step;
          const done = index < step;
          return (
            <li key={label}>
              <button
                type="button"
                disabled={index > step}
                onClick={() => {
                  if (index < step) setStep(index);
                }}
                className="flex w-full flex-col items-center gap-1 disabled:cursor-default"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    current || done ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {index + 1}
                </span>
                <span className={`text-center text-[11px] leading-tight sm:text-xs ${current ? "font-medium text-gray-900" : "text-gray-500"}`}>
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {state?.error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</div>
      )}

      {organizations.length > 1 ? (
        <div>
          <label htmlFor="organizationId" className="block text-sm font-medium text-gray-700">
            {t.dashboard.formOrganization}
          </label>
          <select
            id="organizationId"
            name="organizationId"
            required
            defaultValue={organizations[0]?.id}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500"
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      ) : organizations.length === 1 ? (
        <input type="hidden" name="organizationId" value={organizations[0].id} />
      ) : null}

      <div data-step="0" className={step === 0 ? "space-y-6" : "hidden"}>
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
        <div className="grid gap-4 sm:grid-cols-2">
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
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
              {t.dashboard.formEndDate}
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              required
              defaultValue={initial?.endDate || initial?.date}
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
        </div>
      </div>

      <div data-step="1" className={step === 1 ? "space-y-6" : "hidden"}>
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
      </div>

      <div data-step="2" className={step === 2 ? "space-y-6" : "hidden"}>
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
      </div>

      <div data-step="3" className={step === 3 ? "space-y-6" : "hidden"}>
      <div>
        <p className="block text-sm font-medium text-gray-700">{t.dashboard.formImage}</p>
        <label
          htmlFor="cover"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files?.[0];
            if (file) void applyCover(file);
          }}
          className="mt-1 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500 hover:border-gray-400"
        >
          {preview ? (
            <img src={preview} alt="" className="mb-3 max-h-40 rounded-lg object-contain" />
          ) : null}
          {compressing ? <span className="mt-2 text-gray-700">{t.dashboard.imageShrinking}</span> : null}
          {imageError ? <span className="mt-2 text-red-600">{imageError}</span> : null}
          <span className="mt-2">{t.dashboard.formImageHint}</span>
          <input
            id="cover"
            name="cover"
            type="file"
            accept="image/jpeg,image/png"
            className="sr-only"
            onChange={(event) => void applyCover(event.target.files?.[0])}
          />
        </label>
      </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 pt-6">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((current) => current - 1)}
            className="mr-auto rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50"
          >
            {t.dashboard.stepBack}
          </button>
        ) : null}
        {step < steps.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            {t.dashboard.stepNext}
          </button>
        ) : eventId ? (
          <button
            type="submit"
            disabled={isPending || compressing}
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
              disabled={isPending || compressing}
              className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
            >
              {t.dashboard.saveDraft}
            </button>
            <button
              type="submit"
              name="intent"
              value="publish"
              disabled={isPending || compressing}
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
