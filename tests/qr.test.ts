import encodeQR, { Bitmap } from "qr";
import decodeQR from "qr/decode.js";
import { describe, expect, it } from "vitest";

describe("poster QR payload", () => {
  it("round-trips a realistic canonical URL at high correction", () => {
    const expected = "https://example.com/articles/page-poster?id=42&lang=zh-CN";
    const matrix = encodeQR(expected, "raw", { ecc: "high", border: 4 });
    const bitmap = new Bitmap(
      { width: matrix[0]?.length || 0, height: matrix.length },
      matrix,
    );
    bitmap.scale(4);
    expect(decodeQR(bitmap.toImage())).toBe(expected);
  });
});
