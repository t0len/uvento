export function OrgMark({ name }: { name: string }) {
  const letters = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-semibold text-gray-700">
      {letters || "—"}
    </div>
  );
}
