import { describe, expect, it } from "vitest";
import { parseFitsHeaderHints } from "./fits-header-sniff";

function card80(s: string): string {
  return s.length >= 80 ? s.slice(0, 80) : s.padEnd(80, " ");
}

describe("parseFitsHeaderHints", () => {
  it("reads common cards from a minimal FITS header block", () => {
    const lines = [
      card80("SIMPLE  =                    T / conforms to FITS standard"),
      card80("BITPIX  =                   16 / bits per pixel"),
      card80("NAXIS   =                    2 / number of axes"),
      card80("NAXIS1  =                  100 / length"),
      card80("NAXIS2  =                  100 / length"),
      card80("OBJECT  = 'M42     '       / target name"),
      card80("EXPTIME =                 120.0 / seconds"),
      card80("END"),
    ];
    const buf = Buffer.from(lines.join(""), "ascii");
    const hints = parseFitsHeaderHints(buf);
    expect(hints.SIMPLE).toBe("T");
    expect(hints.BITPIX).toBe("16");
    expect(hints.OBJECT).toBe("M42");
    expect(hints.EXPTIME).toBe("120.0");
  });
});
