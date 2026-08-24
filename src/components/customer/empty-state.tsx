import Link from "next/link";

export function EmptyState({
  message,
  action,
}: {
  message: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="rounded-xl border border-dashed border-outline-variant p-6 text-center space-y-3">
      <p className="text-body-md text-on-surface-variant">{message}</p>
      {action ? (
        <Link
          href={action.href}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary text-on-primary px-4 text-label-lg font-medium"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
