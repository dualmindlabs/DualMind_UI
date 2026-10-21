/**
 * Saves a file built in the browser: an object URL on a temporary `<a download>`, clicked, then
 * released. Nothing is uploaded; the CSP needs nothing extra (downloads are not fetches).
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  // Some browsers start reading the URL only after the click handler returns.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
