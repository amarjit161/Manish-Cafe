export function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-surface-container-lowest border border-outline-variant p-4">
      <p className="text-label-sm text-on-surface-variant">{label}</p>
      <p className="text-headline-md text-foreground mt-1">{value}</p>
    </div>
  );
}
