"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOrganizerAccount, deleteUserAccount } from "@/actions/admin";
import { useI18n } from "@/components/i18n/i18n-provider";

export function CreateOrganizerForm({ organizations }: { organizations: { id: string; name: string }[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-6 grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        startTransition(async () => {
          setError(null);
          const result = await createOrganizerAccount(formData);
          if (result.error) setError(result.error);
          else {
            form.reset();
            router.refresh();
          }
        });
      }}
    >
      <h2 className="sm:col-span-2 text-sm font-semibold text-gray-900">{t.admin.createOrganizer}</h2>
      <input
        name="name"
        required
        placeholder={t.common.user}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
      />
      <input
        name="email"
        type="email"
        required
        placeholder={t.auth.email}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
      />
      <input
        name="password"
        type="password"
        required
        minLength={8}
        placeholder={t.admin.organizerPassword}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
      />
      <select
        name="organizationId"
        required
        defaultValue=""
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
      >
        <option value="" disabled>
          {t.admin.organizerOrg}
        </option>
        {organizations.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
      {error ? <p className="sm:col-span-2 text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending || organizations.length === 0}
        className="sm:col-span-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? t.common.loading : t.admin.createOrganizer}
      </button>
    </form>
  );
}

export function DeleteUserButton({ userId }: { userId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(t.admin.deleteUserConfirm)) return;
        startTransition(async () => {
          const result = await deleteUserAccount(userId);
          if (result.error) alert(result.error);
          else router.refresh();
        });
      }}
      className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "…" : t.admin.deleteUser}
    </button>
  );
}
