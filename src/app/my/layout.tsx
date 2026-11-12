import { Header } from "@/components/layout/header";
import { requireAuth } from "@/lib/auth";

export default async function MyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
