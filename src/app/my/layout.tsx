import { Header } from "@/components/layout/header";

export default function MyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      {children}
    </div>
  );
}
