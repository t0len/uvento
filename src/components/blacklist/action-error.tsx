import Link from "next/link";

export function ActionError({
  message,
  href,
  linkLabel,
}: {
  message: string;
  href?: string | null;
  linkLabel: string;
}) {
  return (
    <p className="mt-2 text-sm text-red-600">
      {message}
      {href ? (
        <>
          {" "}
          <Link href={href} className="font-medium underline">
            {linkLabel}
          </Link>
        </>
      ) : null}
    </p>
  );
}
