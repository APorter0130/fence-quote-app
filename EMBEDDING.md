# Embedding The Quote Form

The app now posts resize events to its parent window when it is loaded inside an iframe.

Quick setup:

1. Use `/embed/quote?contractor=aj-fence` as the iframe URL.
2. Copy the resize listener snippet below into the host page.
3. If you do not have a host page yet, open `/embed-preview` locally to test the embed behavior.

Preferred embed URL:

- `/embed/quote?contractor=aj-fence`

Fallback embed URL when you need to keep the standard route:

- `/quote?contractor=aj-fence&embed=1`

Messages sent from the iframe:

- `fence-estimator:ready`
- `fence-estimator:resize`

Optional origin allowlist:

- Set `NEXT_PUBLIC_IFRAME_PARENT_ORIGINS` to a comma-separated list of allowed parent origins.
- Example: `NEXT_PUBLIC_IFRAME_PARENT_ORIGINS=https://www.contractorsite.com,https://staging.contractorsite.com`
- When this variable is set, resize messages are sent only if `document.referrer` matches one of the configured origins.

Resize payload shape:

```ts
type FenceEstimatorResizeMessage = {
  type: "fence-estimator:resize";
  height: number;
  width: number;
  path: string;
};
```

Example host page integration:

```html
<iframe
  id="fence-estimator"
  src="https://your-app.example/embed/quote?contractor=aj-fence"
  title="Fence estimator"
  style="width: 100%; border: 0; height: 640px;"
  scrolling="no"
></iframe>

<script>
  const iframe = document.getElementById("fence-estimator");

  window.addEventListener("message", (event) => {
    if (!event.data || event.data.type !== "fence-estimator:resize") {
      return;
    }

    iframe.style.height = `${Math.ceil(event.data.height)}px`;
  });
</script>
```

Copy-ready snippet:

```html
<iframe
  src="https://your-app.example/embed/quote?contractor=aj-fence"
  title="Fence estimator"
  style="width:100%;border:0;height:640px"
  scrolling="no"
></iframe>
<script>
  const frame = document.querySelector('iframe[title="Fence estimator"]');

  window.addEventListener("message", (event) => {
    if (event.data?.type === "fence-estimator:resize") {
      frame.style.height = `${Math.ceil(event.data.height)}px`;
    }
  });
</script>
```

Recommended host settings:

- Set `scrolling="no"` on the iframe.
- Keep the iframe width fluid with `width: 100%`.
- Prefer the dedicated `/embed/quote` route. Use `&embed=1` on `/quote` only when the standard route must be reused.
- If you plan to restrict messaging, set `NEXT_PUBLIC_IFRAME_PARENT_ORIGINS` before deployment.
- On the host page, validate `event.origin` before applying the height update.

Contractor handoff:

- Send the host team the iframe URL, for example `/embed/quote?contractor=aj-fence`.
- Tell them to paste the copy-ready snippet and replace the domain plus contractor slug.
- If they have no staging page yet, use `/embed-preview` locally to confirm sizing and map expansion behavior.