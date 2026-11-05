/**
 * Saves a PDF that came from the provider as base64. Nothing is generated or altered locally.
 */
export function downloadBase64Pdf(base64: string, fileName: string): boolean {
  if (!base64) return false;
  try {
    const clean = base64.replace(/^data:application\/pdf;base64,/, '');
    const bytes = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}
