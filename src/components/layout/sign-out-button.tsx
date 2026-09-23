"use client";

import { signOutAction } from "@/actions/signout";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOutAction()}
      className="text-sm text-gray-500 hover:text-gray-700"
    >
      Выйти
    </button>
  );
}
