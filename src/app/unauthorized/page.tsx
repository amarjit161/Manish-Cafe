import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-sm text-center space-y-3">
        <h1 className="text-headline-md text-foreground">Access denied</h1>
        <p className="text-body-md text-on-surface-variant">
          You don&apos;t have permission to view that page with this account.
        </p>
        <Link href="/" className="inline-block text-label-lg text-primary underline">
          Return to homepage
        </Link>
      </div>
    </div>
  );
}
