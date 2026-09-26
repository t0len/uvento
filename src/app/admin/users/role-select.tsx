"use client";

import { useTransition } from "react";
import { updateUserRole } from "@/actions/admin";

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
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={currentRole}
      disabled={disabled || pending}
      onChange={(e) => {
        const role = e.target.value;
        startTransition(async () => {
          const result = await updateUserRole(userId, role);
          if (result?.error) {
            alert(result.error);
            e.target.value = currentRole;
          }
        });
      }}
      className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 disabled:opacity-50"
    >
      {ROLES.map((role) => (
        <option key={role} value={role}>
          {role}
        </option>
      ))}
    </select>
  );
}
