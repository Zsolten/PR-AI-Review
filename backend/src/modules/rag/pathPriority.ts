/** Prefer app source dirs when capping files for free-tier embedding quotas. */
export function prioritizeIndexablePaths(paths: string[]): string[] {
  const score = (p: string): number => {
    const lower = p.toLowerCase();
    let s = 0;
    if (/^(src|backend|frontend|lib|app|server|api|packages)\//.test(lower)) s += 12;
    if (lower.endsWith(".ts") || lower.endsWith(".tsx")) s += 6;
    if (lower.endsWith(".py") || lower.endsWith(".go")) s += 4;
    if (lower.includes("test") || lower.includes("spec") || lower.includes("__tests__")) s -= 4;
    if (lower.includes("node_modules") || lower.includes("dist/")) s -= 50;
    return s;
  };

  return [...paths].sort((a, b) => score(b) - score(a));
}
