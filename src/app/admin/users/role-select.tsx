"use client";

import { useState, useTransition } from "react";
import { updateUserRole } from "@/actions/admin";
import { useI18n } from "@/components/i18n/i18n-provider";

const ROLES = ["STUDENT", "ORGANIZER", "ADMIN"] as const;

export function RoleSelect({
  userId,
  currentRole,
  disabled,
}: {
  userId: string;
  currentRole: string;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const labels: Record<(typeof ROLES)[number], string> = {
    STUDENT: t.menu.roleStudent,
    ORGANIZER: t.menu.roleOrganizer,
    ADMIN: t.menu.roleAdmin,
  };

  return (
    <div>
      <select
        defaultValue={currentRole}
        disabled={disabled || pending}
        onChange={(e) => {
          const role = e.target.value;
          setError(null);
          startTransition(async () => {
            const result = await updateUserRole(userId, role);
            if (result?.error) {
              setError(result.error);
              e.target.value = currentRole;
            }
          });
        }}
        className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 disabled:opacity-50"
      >
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {labels[role]}
          </option>
        ))}
      </select>
      {error ? <p className="mt-1 max-w-48 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
