/**
 * Parses a subset of FITS primary header keywords from the first header unit
 * (2880-byte blocks until END card). No image data is decoded.
 */
const FITS_BLOCK = 2880;

const INTERESTING = new Set([
  "SIMPLE",
  "BITPIX",
  "NAXIS",
  "NAXIS1",
  "NAXIS2",
  "NAXIS3",
  "OBJECT",
  "EXPTIME",
  "EXPOSURE",
  "FILTER",
  "INSTRUME",
  "TELESCOP",
  "DATE-OBS",
  "RA",
  "DEC",
]);

export type FitsHeaderHints = Record<string, string>;

function parseCardValue(
  rawLine: string
): { key: string; value: string } | null {
  const line = rawLine.length === 80 ? rawLine : rawLine.padEnd(80, " ");
  const eq = line.indexOf("=");
  if (eq < 8 || eq > 72) return null;
  const key = line.slice(0, 8).trim();
  if (!key || key === "END") return null;
  let rest = line.slice(eq + 1).trim();
  const slash = rest.indexOf("/");
  if (slash >= 0) {
    rest = rest.slice(0, slash).trim();
  }
  if (rest.startsWith("'")) {
    const end = rest.indexOf("'", 1);
    const inner = end > 1 ? rest.slice(1, end) : rest.slice(1);
    return { key, value: inner.trim() };
  }
  return { key, value: rest.trim() };
}

export function parseFitsHeaderHints(buffer: Buffer): FitsHeaderHints {
  const hints: FitsHeaderHints = {};
  const max = Math.min(buffer.length, FITS_BLOCK * 4);
  for (let offset = 0; offset + 80 <= max; offset += 80) {
    const line = buffer.subarray(offset, offset + 80).toString("ascii");
    if (line.startsWith("END")) break;
    const parsed = parseCardValue(line);
    if (!parsed) continue;
    if (INTERESTING.has(parsed.key)) {
      hints[parsed.key] = parsed.value;
    }
  }
  return hints;
}

export function isLikelyFitsFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith(".fits") || lower.endsWith(".fit");
}
