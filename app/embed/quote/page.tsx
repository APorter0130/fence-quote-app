import { Suspense } from "react";
import QuotePage from "../../quote/page";

export default function EmbedQuotePage() {
  return (
    <Suspense fallback={<main className="px-4 py-10 text-slate-900">Loading quote form...</main>}>
      <QuotePage />
    </Suspense>
  );
}

