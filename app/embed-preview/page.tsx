"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  IFRAME_READY_MESSAGE,
  IFRAME_RESIZE_MESSAGE,
} from "../../components/iframe-host-sync";

type EmbedEvent = {
  type: string;
  height?: number;
  width?: number;
  path?: string;
  tenant?: string;
  origin: string;
  receivedAt: string;
};

const DEFAULT_CONTRACTOR = "aj-fence";

export default function EmbedPreviewPage() {
  const [draftContractor, setDraftContractor] = useState(DEFAULT_CONTRACTOR);
  const [contractor, setContractor] = useState(DEFAULT_CONTRACTOR);
  const [useFallbackRoute, setUseFallbackRoute] = useState(false);
  const [frameHeight, setFrameHeight] = useState(640);
  const [events, setEvents] = useState<EmbedEvent[]>([]);

  const embedPath = useMemo(() => {
    const query = `contractor=${encodeURIComponent(contractor)}`;

    if (useFallbackRoute) {
      return `/quote?${query}&embed=1`;
    }

    return `/embed/quote?${query}`;
  }, [contractor, useFallbackRoute]);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const expectedOrigin = window.location.origin;

      if (event.origin !== expectedOrigin) {
        return;
      }

      if (
        !event.data ||
        (event.data.type !== IFRAME_READY_MESSAGE &&
          event.data.type !== IFRAME_RESIZE_MESSAGE)
      ) {
        return;
      }

      if (event.data.tenant && event.data.tenant !== contractor) {
        return;
      }

      if (event.data.type === IFRAME_RESIZE_MESSAGE && typeof event.data.height === "number") {
        setFrameHeight(Math.ceil(event.data.height));
      }

      setEvents((current) => [
        {
          type: event.data.type,
          height: event.data.height,
          width: event.data.width,
          path: event.data.path,
          tenant: event.data.tenant,
          origin: event.origin,
          receivedAt: new Date().toLocaleTimeString(),
        },
        ...current,
      ].slice(0, 8));
    };

    window.addEventListener("message", listener);

    return () => {
      window.removeEventListener("message", listener);
    };
  }, [contractor]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextContractor = draftContractor.trim();

    if (!nextContractor) {
      return;
    }

    setContractor(nextContractor);
    setEvents([]);
  }

  return (
    <main className="min-h-screen px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl fade-in-up">
        <header className="mb-8">
          <div className="inline-flex rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-700">
            Local Embed Preview
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Test the quote iframe before a host page exists
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-700">
            This page embeds the widget locally, listens for resize messages, and shows the exact iframe URL you can reuse later.
          </p>
        </header>

        <section className="glass-panel rounded-[32px] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)] md:p-6">
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <aside className="space-y-5">
              <div className="rounded-3xl border border-black/10 bg-slate-50 p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Preview Controls
                </p>
                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                      Contractor Slug Or UUID
                    </label>
                    <input
                      value={draftContractor}
                      onChange={(event) => setDraftContractor(event.target.value)}
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-400/70 focus:ring-4 focus:ring-amber-400/10"
                      placeholder="aj-fence"
                    />
                  </div>

                  <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-4 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={useFallbackRoute}
                      onChange={(event) => setUseFallbackRoute(event.target.checked)}
                      className="h-4 w-4 accent-amber-400"
                    />
                    Use the fallback route with `embed=1`
                  </label>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90"
                  >
                    Reload Preview
                  </button>
                </form>
              </div>

              <div className="rounded-3xl border border-amber-300/20 bg-gradient-to-br from-amber-300/12 via-white/[0.03] to-transparent p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100/80">
                  Current Embed URL
                </p>
                <p className="mt-3 break-all rounded-2xl border border-black/10 bg-slate-100 px-3 py-3 font-mono text-xs text-slate-700">
                  {embedPath}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  Use this route later in your real host page. The preview iframe below uses the same path.
                </p>
              </div>

              <div className="rounded-3xl border border-black/10 bg-slate-50 p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Resize Events
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  Current iframe height: <span className="font-semibold text-slate-900">{frameHeight}px</span>
                </p>
                <div className="mt-4 space-y-3">
                  {events.length === 0 ? (
                    <p className="text-sm text-slate-500">No iframe messages received yet.</p>
                  ) : (
                    events.map((event, index) => (
                      <div
                        key={`${event.type}-${event.receivedAt}-${index}`}
                        className="rounded-2xl border border-black/10 bg-slate-100 px-3 py-3 text-xs text-slate-700"
                      >
                        <p className="font-semibold uppercase tracking-[0.12em] text-slate-900">
                          {event.type}
                        </p>
                        <p className="mt-1">Time: {event.receivedAt}</p>
                        <p>Origin: {event.origin || "same-origin"}</p>
                        <p>Path: {event.path || "n/a"}</p>
                        <p>Tenant: {event.tenant || "n/a"}</p>
                        {typeof event.height === "number" ? <p>Height: {event.height}px</p> : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </aside>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-3xl border border-black/10 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Embedded Frame
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    This simulates a host page wrapping the quote tool.
                  </p>
                </div>
                <Link
                  href={embedPath}
                  target="_blank"
                  className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
                >
                  Open Raw Route
                </Link>
              </div>

              <div className="overflow-hidden rounded-[32px] border border-black/10 bg-slate-100 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
                <iframe
                  key={embedPath}
                  src={embedPath}
                  title="Fence estimator preview"
                  className="w-full border-0"
                  style={{ height: `${frameHeight}px` }}
                  scrolling="no"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}


