import Link from "next/link";

/**
 * Consistent "‹ Back to X" affordance for detail pages. Deliberately just a
 * link, not a browser-history back button -- a direct link always lands
 * somewhere sensible even if the page was opened straight from a bookmark
 * or a shared URL with no history to go back to.
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-label-sm font-medium text-primary hover:underline focus-visible:underline"
    >
      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
        arrow_back
      </span>
      {label}
    </Link>
  );
}
