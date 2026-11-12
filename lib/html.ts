/** Escape text before putting it inside HTML (emails, templates). */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Keep only characters that are valid in a tel: link. */
export function telHref(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}
