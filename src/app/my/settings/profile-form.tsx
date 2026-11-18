"use client";

import { useActionState } from "react";
import { updateProfile } from "@/actions/auth";
import { useI18n } from "@/components/i18n/i18n-provider";

const fieldClass =
  "mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900";

export function ProfileForm({
  name,
  lastName,
  phone,
}: {
  name: string;
  lastName: string;
  phone: string | null;
}) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(updateProfile, undefined);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="name" className="text-sm font-medium text-gray-500">
          {t.common.name}
        </label>
        <input
          id="name"
          name="name"
          defaultValue={name}
          required
          minLength={2}
          autoComplete="given-name"
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor="lastName" className="text-sm font-medium text-gray-500">
          {t.common.lastName}
        </label>
        <input
          id="lastName"
          name="lastName"
          defaultValue={lastName}
          required
          minLength={2}
          autoComplete="family-name"
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor="phone" className="text-sm font-medium text-gray-500">
          {t.common.phone}
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={phone ?? ""}
          required
          autoComplete="tel"
          placeholder="+7 700 000 00 00"
          className={fieldClass}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? t.common.loading : t.common.save}
      </button>
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-green-700">{t.common.saved}</p> : null}
    </form>
  );
}
