import { Suspense } from "react";
import QuotePage from "../../quote/page";

export default function EmbedQuotePage() {
  return (
    <Suspense fallback={<main className="px-4 py-10 text-white">Loading quote form...</main>}>
      <QuotePage />
    </Suspense>
  );
}