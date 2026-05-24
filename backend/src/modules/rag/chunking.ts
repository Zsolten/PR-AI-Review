export interface TextChunk {
  chunkIndex: number;
  content: string;
}

/** Splits source text into overlapping chunks for embedding. */
export function chunkText(
  text: string,
  maxChunkSize: number,
  overlap: number
): TextChunk[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  if (normalized.length <= maxChunkSize) {
    return [{ chunkIndex: 0, content: normalized }];
  }

  const chunks: TextChunk[] = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < normalized.length) {
    let end = Math.min(start + maxChunkSize, normalized.length);

    if (end < normalized.length) {
      const slice = normalized.slice(start, end);
      const breakAt = Math.max(
        slice.lastIndexOf("\n\n"),
        slice.lastIndexOf("\n"),
        slice.lastIndexOf(" ")
      );
      if (breakAt > maxChunkSize * 0.5) {
        end = start + breakAt;
      }
    }

    const content = normalized.slice(start, end).trim();
    if (content) {
      chunks.push({ chunkIndex, content });
      chunkIndex += 1;
    }

    if (end >= normalized.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}
