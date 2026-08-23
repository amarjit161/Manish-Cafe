export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-outline-variant p-6 text-center text-on-surface-variant text-body-md">
      {message}
    </div>
  );
}
