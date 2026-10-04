export function EventCover({
  url,
  label,
  className,
}: {
  url?: string | null;
  label: string;
  className: string;
}) {
  if (url) {
    return <img src={url} alt={label} className={`object-cover ${className}`} />;
  }

  return (
    <div className={`flex items-center justify-center bg-gray-200 text-sm text-gray-400 ${className}`}>
      {label}
    </div>
  );
}
