/**
 * Khmer word segmentation using Intl.Segmenter
 */

export interface SegmentItem {
  id: string;
  text: string;
  isWord: boolean;
  wordIndex?: number; // index only among clickable words
}

export function segmentKhmerText(content: string): SegmentItem[] {
  if (!content) return [];

  // Punctuation and whitespace detection regex
  const nonWordRegex = /^[\s\p{P}\p{S}]+$/u;

  // Check if Intl.Segmenter is supported
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    try {
      // @ts-ignore
      const segmenter = new Intl.Segmenter('km', { granularity: 'word' });
      const segments = Array.from(segmenter.segment(content)) as Array<{ segment: string; isWordLike?: boolean }>;

      let wordCounter = 0;
      return segments.map((seg, idx) => {
        const text = seg.segment;
        const isWhitespaceOrPunctuation = nonWordRegex.test(text.trim());
        const isWord = !isWhitespaceOrPunctuation && text.trim().length > 0;

        return {
          id: `seg-${idx}`,
          text,
          isWord,
          wordIndex: isWord ? wordCounter++ : undefined,
        };
      });
    } catch {
      // fallback to basic tokenization if Intl.Segmenter throws
    }
  }

  // Fallback: split by whitespace or zero-width space
  const tokens = content.split(/(\s+|[!?.,;:«»()]+)/u);
  let counter = 0;
  return tokens.map((text, idx) => {
    const isWord = text.trim().length > 0 && !nonWordRegex.test(text.trim());
    return {
      id: `seg-fallback-${idx}`,
      text,
      isWord,
      wordIndex: isWord ? counter++ : undefined,
    };
  });
}

/**
 * Extract purely the list of clickable words from segments
 */
export function extractClickableWords(segments: SegmentItem[]): string[] {
  return segments.filter((s) => s.isWord).map((s) => s.text);
}

/**
 * Format date to Khmer locale or dd/mm/yyyy
 */
export function formatKhmerDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return dateString;
  }
}

/**
 * Convert western digits to Khmer numerals (e.g. 1 -> ១)
 */
export function toKhmerDigits(num: number | string | null | undefined): string {
  if (num === null || num === undefined) return '';
  const str = String(num);
  const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  return str.replace(/[0-9]/g, (digit) => khmerDigits[parseInt(digit, 10)]);
}
