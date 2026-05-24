/** File extensions worth indexing for architecture-aware RAG. */
export const INDEXABLE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".cs",
  ".sql",
  ".prisma",
  ".graphql",
  ".yaml",
  ".yml",
  ".json",
  ".md",
]);

export const SKIP_PATH_PREFIXES = [
  "node_modules/",
  "dist/",
  "build/",
  ".git/",
  "coverage/",
  "vendor/",
  "__pycache__/",
];

export const SKIP_PATH_SEGMENTS = ["/node_modules/", "/.next/", "/target/"];

export function isIndexablePath(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  if (SKIP_PATH_PREFIXES.some((p) => lower.startsWith(p))) return false;
  if (SKIP_PATH_SEGMENTS.some((s) => lower.includes(s))) return false;
  const dot = lower.lastIndexOf(".");
  if (dot === -1) return false;
  return INDEXABLE_EXTENSIONS.has(lower.slice(dot));
}
