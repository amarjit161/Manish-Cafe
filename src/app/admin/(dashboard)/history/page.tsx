import { HistoryView } from "@/components/admin/history-view";

export default async function AdminHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab === "seva" || params.tab === "courses" ? params.tab : "gaming";

  return (
    <div>
      <header className="mb-8 bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-outline-variant/30">
        <h1 className="text-headline-lg text-primary">Activity History</h1>
        <p className="text-on-surface-variant text-sm">
          Full record of every gaming booking, seva request and course enquiry.
        </p>
      </header>

      <HistoryView initialTab={tab} />
    </div>
  );
}
