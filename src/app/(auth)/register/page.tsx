"use client";

import { useState } from "react";
import { register } from "@/actions/auth";
import Link from "next/link";
import { useI18n, LanguageSwitcher } from "@/components/i18n/i18n-provider";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      const result = await register(formData);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      }
    } catch (error) {
      const digest = typeof error === "object" && error && "digest" in error ? String(error.digest) : "";
      if (digest.startsWith("NEXT_REDIRECT")) throw error;
      setError(t.auth.createFailed);
      setLoading(false);
    }
  }

  return (
    <div className="relative rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/90">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
          <p className="text-sm font-medium text-gray-900">{t.auth.creating}</p>
        </div>
      )}
      <div className="mb-4 flex justify-end">
        <LanguageSwitcher compact />
      </div>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t.auth.registerTitle}</h1>
        <p className="mt-1 text-sm text-gray-500">{t.auth.registerSubtitle}</p>
      </div>

      <form action={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            {t.auth.name}
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            {t.auth.email}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            {t.auth.password}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            {t.auth.confirmPassword}
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? t.auth.creating : t.auth.createAccount}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        {t.auth.haveAccount}{" "}
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
          {t.auth.loginLink}
        </Link>
      </p>
    </div>
  );
}
