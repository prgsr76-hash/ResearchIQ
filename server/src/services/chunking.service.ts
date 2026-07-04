/** A single text chunk produced by the splitter */
export interface Chunk {
  text: string;
  chunkIndex: number;
  estimatedPage: number;
}

/** Separator hierarchy: paragraph → line → sentence → word */
const SEPARATORS = ['\n\n', '\n', '. ', ' '];

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_OVERLAP = 200;

/**
 * Recursively splits text into overlapping chunks.
 *
 * Uses a hierarchy of separators (paragraph breaks → line breaks → sentences → spaces)
 * to produce chunks of approximately `chunkSize` characters with `overlap` character overlap.
 *
 * @param text      - The full document text to split
 * @param pageCount - Total pages in the source document (used for page estimation)
 * @param chunkSize - Target chunk size in characters (default 1000)
 * @param overlap   - Number of overlapping characters between consecutive chunks (default 200)
 * @returns Array of Chunk objects with text, index, and estimated page number
 */
export function chunkText(
  text: string,
  pageCount: number,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlap: number = DEFAULT_OVERLAP
): Chunk[] {
  if (!text || text.trim().length === 0) return [];

  const rawChunks = recursiveSplit(text, SEPARATORS, chunkSize);
  const mergedChunks = mergeWithOverlap(rawChunks, chunkSize, overlap);

  const totalLength = text.length;

  return mergedChunks.map((chunkText, index) => {
    // Estimate which page this chunk comes from based on character position
    const charPosition = text.indexOf(chunkText.slice(0, 50));
    const estimatedPage =
      charPosition >= 0
        ? Math.min(Math.floor((charPosition / totalLength) * pageCount) + 1, pageCount)
        : 1;

    return {
      text: chunkText.trim(),
      chunkIndex: index,
      estimatedPage,
    };
  }).filter((chunk) => chunk.text.length > 0);
}

/**
 * Recursively split text by trying each separator in order.
 * Larger separators (paragraph breaks) are tried first; falls back to smaller ones.
 */
function recursiveSplit(
  text: string,
  separators: string[],
  chunkSize: number
): string[] {
  if (text.length <= chunkSize) return [text];
  if (separators.length === 0) {
    // Last resort: hard-cut at chunkSize
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
  }

  const [separator, ...remaining] = separators;
  const parts = text.split(separator);
  const result: string[] = [];
  let currentPart = '';

  for (const part of parts) {
    const candidate = currentPart
      ? currentPart + separator + part
      : part;

    if (candidate.length <= chunkSize) {
      currentPart = candidate;
    } else {
      if (currentPart) result.push(currentPart);

      if (part.length > chunkSize) {
        // This part alone is too big — recurse with a smaller separator
        result.push(...recursiveSplit(part, remaining, chunkSize));
        currentPart = '';
      } else {
        currentPart = part;
      }
    }
  }

  if (currentPart) result.push(currentPart);
  return result;
}

/**
 * Merges raw splits and re-applies overlap between consecutive chunks.
 */
function mergeWithOverlap(
  splits: string[],
  chunkSize: number,
  overlap: number
): string[] {
  if (splits.length <= 1) return splits;

  const result: string[] = [];
  let current = splits[0] ?? '';

  for (let i = 1; i < splits.length; i++) {
    if ((current + ' ' + splits[i]!).length <= chunkSize) {
      current = current + ' ' + splits[i]!;
    } else {
      result.push(current);
      // Start next chunk with overlap from end of current
      const overlapText = current.slice(-overlap);
      current = overlapText + ' ' + splits[i]!;
    }
  }

  if (current) result.push(current);
  return result;
}
