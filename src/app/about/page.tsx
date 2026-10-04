import { Header } from "@/components/layout/header";
import { getI18n } from "@/lib/i18n";

export default async function AboutPage() {
  const { t } = await getI18n();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900">{t.aboutPage.title}</h1>
        <p className="mt-4 text-lg text-gray-800">{t.aboutPage.lead}</p>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">{t.aboutPage.body}</p>
      </main>
    </div>
  );
}
