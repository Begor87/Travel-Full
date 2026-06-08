/**
 * Copies text to the clipboard, working even outside a secure context.
 *
 * `navigator.clipboard` is only available over HTTPS or on localhost — when the
 * app is served over plain HTTP on a LAN IP (e.g. http://192.168.x.x) it's
 * undefined. We fall back to a hidden <textarea> + execCommand('copy'), which
 * works in insecure contexts. Returns true on success.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Preferred path — available on HTTPS / localhost
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through to legacy method */
    }
  }

  // Legacy fallback for insecure contexts (LAN IP over HTTP)
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
