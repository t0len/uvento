"use client";

import { useActionState, useState, useTransition } from "react";
import { addOrganizationMember, createOrganization, removeOrganizationMember } from "@/actions/admin";
import { useI18n } from "@/components/i18n/i18n-provider";

export function CreateOrgForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => createOrganization(formData),
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <label className="block flex-1 text-sm font-medium text-gray-700">
        {t.admin.orgName}
        <input
          name="name"
          required
          minLength={2}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-500"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {t.admin.createOrg}
      </button>
      {state?.error ? <p className="text-sm text-red-600 sm:basis-full">{state.error}</p> : null}
    </form>
  );
}

export function AddMemberForm({ organizationId }: { organizationId: string }) {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
      action={(formData) => {
        startTransition(async () => {
          setError(null);
          const result = await addOrganizationMember(organizationId, formData);
          if ("error" in result && result.error) setError(result.error);
        });
      }}
    >
      <label className="block flex-1 text-sm font-medium text-gray-700">
        {t.admin.memberEmail}
        <input
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-500"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
      >
        {t.admin.addMember}
      </button>
      {error ? <p className="text-sm text-red-600 sm:basis-full">{error}</p> : null}
    </form>
  );
}

export function RemoveMemberButton({ membershipId }: { membershipId: string }) {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            setError(null);
            const result = await removeOrganizationMember(membershipId);
            if ("error" in result && result.error) setError(result.error);
          });
        }}
        className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
      >
        {t.admin.removeMember}
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </span>
  );
}
