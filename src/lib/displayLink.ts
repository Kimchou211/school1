export interface DisplayPayload {
  title: string;
  content: string;
  studentName?: string;
}

const DEFAULT_DISPLAY_TITLE = 'អត្ថបទសម្រាប់សិស្សអាន';
const DEFAULT_DISPLAY_CONTENT = 'សូមរង់ចាំគ្រូចាប់ផ្ដើមវគ្គអាន...';

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Create a standalone student/projector URL without requiring the viewer to sign in. */
export function createDisplayUrl(payload: DisplayPayload): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('view', 'display');
  url.hash = `display=${encodeBase64Url(JSON.stringify(payload))}`;
  return url.toString();
}

export function isDisplayUrl(search: string, hash: string): boolean {
  return new URLSearchParams(search).get('view') === 'display' || hash.includes('display');
}

/** Read a shared display payload, and retain compatibility with older display URLs. */
export function readDisplayPayload(search: string, hash: string): DisplayPayload {
  const match = hash.match(/^#display=([^&]*)/);
  if (match?.[1]) {
    try {
      const parsed = JSON.parse(decodeBase64Url(match[1])) as Partial<DisplayPayload>;
      if (typeof parsed.title === 'string' && typeof parsed.content === 'string') {
        return {
          title: parsed.title || DEFAULT_DISPLAY_TITLE,
          content: parsed.content || DEFAULT_DISPLAY_CONTENT,
          studentName: typeof parsed.studentName === 'string' ? parsed.studentName : undefined,
        };
      }
    } catch {
      // Fall back to ordinary query parameters for older/shared links.
    }
  }

  const params = new URLSearchParams(search);
  return {
    title: params.get('title') || DEFAULT_DISPLAY_TITLE,
    content: params.get('content') || DEFAULT_DISPLAY_CONTENT,
    studentName: params.get('student') || undefined,
  };
}
