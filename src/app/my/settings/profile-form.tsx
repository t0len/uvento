"use client";

import { useActionState } from "react";
import { updateName } from "@/actions/auth";
import { useI18n } from "@/components/i18n/i18n-provider";

export function ProfileForm({ name }: { name: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(updateName, undefined);

  return (
    <form action={action} className="space-y-3">
      <label htmlFor="name" className="text-sm font-medium text-gray-500">
        {t.common.name}
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="name"
          name="name"
          defaultValue={name}
          required
          minLength={2}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50"
        >
          {pending ? t.common.loading : t.common.save}
        </button>
      </div>
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-green-700">{t.common.saved}</p> : null}
    </form>
  );
}
