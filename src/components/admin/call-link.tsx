"use client";

export function CallLink({ phone, className }: { phone: string; className?: string }) {
  return (
    <a
      href={`tel:${phone.replace(/[^0-9+]/g, "")}`}
      onClick={(e) => e.stopPropagation()}
      className={
        className ??
        "inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-secondary hover:underline"
      }
    >
      <span className="material-symbols-outlined text-[14px]">call</span>
      {phone}
    </a>
  );
}
