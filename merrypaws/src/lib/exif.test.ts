import { describe, expect, it } from "vitest";
import { readExifDate } from "./exif";

// A minimal JPEG: SOI, then an APP1 Exif segment with IFD0 -> Exif IFD ->
// DateTimeOriginal, little-endian.
function jpegWithDate(text: string) {
  const tiff: number[] = [];
  const u16 = (v: number) => tiff.push(v & 0xff, v >> 8);
  const u32 = (v: number) => tiff.push(v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, v >>> 24);
  tiff.push(0x49, 0x49); u16(42); u32(8);
  // IFD0 at 8: one entry pointing at the Exif IFD (at 26).
  u16(1); u16(0x8769); u16(4); u32(1); u32(26); u32(0);
  // Exif IFD at 26: DateTimeOriginal, 20 ASCII chars at 44.
  u16(1); u16(0x9003); u16(2); u32(20); u32(44); u32(0);
  for (const c of text) tiff.push(c.charCodeAt(0));
  tiff.push(0);
  const app1 = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const size = app1.length + 2;
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, size >> 8, size & 0xff, ...app1, 0xff, 0xd9]);
}

describe("exif dates", () => {
  it("reads DateTimeOriginal", () => {
    const date = readExifDate(jpegWithDate("2024:07:14 18:30:05"));
    expect(date && [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours()]).toEqual([2024, 7, 14, 18]);
  });

  it("returns null for anything else", () => {
    expect(readExifDate(new Uint8Array([1, 2, 3, 4]))).toBeNull();
    expect(readExifDate(jpegWithDate("0000:00:00 00:00:00"))).toBeNull();
    expect(readExifDate(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]))).toBeNull();
  });
});
