export const AUTH_INPUT_CLASSNAME =
  "w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary";

export function AuthCard({
  title,
  subtitle,
  accentClassName,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  accentClassName: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className={`rounded-t-2xl px-6 py-5 ${accentClassName}`}>
          <h1 className="text-headline-md font-black text-white">{title}</h1>
          {subtitle ? <p className="text-label-sm text-white/70 mt-1">{subtitle}</p> : null}
        </div>
        <div className="rounded-b-2xl bg-surface-container-lowest border border-t-0 border-outline-variant p-6 space-y-4">
          {children}
        </div>
        {footer ? <div className="mt-4 text-center text-label-sm text-on-surface-variant">{footer}</div> : null}
      </div>
    </div>
  );
}

export function AuthFieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-error-container text-on-error-container text-label-sm px-3 py-2">
      {message}
    </p>
  );
}

export function AuthFieldSuccess({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="status" className="rounded-lg bg-tertiary-container text-on-tertiary-container text-label-sm px-3 py-2">
      {message}
    </p>
  );
}
