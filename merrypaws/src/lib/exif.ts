// Reads when a JPEG was taken (EXIF DateTimeOriginal) so the album can sort
// by the real day and print it as a date stamp. Returns null when the photo
// has no such tag (screenshots, edited images, some Android exports).

export function readExifDate(bytes: Uint8Array): Date | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset);
    const size = view.getUint16(offset + 2);
    if (marker === 0xffe1 && isExifHeader(view, offset + 4)) return readTiff(view, offset + 10);
    if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) return null;
    offset += 2 + size;
  }
  return null;
}

function isExifHeader(view: DataView, at: number) {
  return at + 6 <= view.byteLength && view.getUint32(at) === 0x45786966 && view.getUint16(at + 4) === 0;
}

function readTiff(view: DataView, start: number): Date | null {
  if (start + 8 > view.byteLength) return null;
  const little = view.getUint16(start) === 0x4949;
  const u16 = (at: number) => view.getUint16(at, little);
  const u32 = (at: number) => view.getUint32(at, little);
  const findTag = (ifd: number, tag: number) => {
    if (ifd + 2 > view.byteLength) return null;
    const count = u16(ifd);
    for (let i = 0; i < count; i++) {
      const entry = ifd + 2 + i * 12;
      if (entry + 12 > view.byteLength) return null;
      if (u16(entry) === tag) return entry;
    }
    return null;
  };
  const ifd0 = start + u32(start + 4);
  const exifPointer = findTag(ifd0, 0x8769);
  if (exifPointer === null) return null;
  const exifIfd = start + u32(exifPointer + 8);
  const entry = findTag(exifIfd, 0x9003) ?? findTag(exifIfd, 0x9004);
  if (entry === null) return null;
  const length = u32(entry + 4);
  const at = start + u32(entry + 8);
  if (length < 19 || at + 19 > view.byteLength) return null;
  let text = "";
  for (let i = 0; i < 19; i++) text += String.fromCharCode(view.getUint8(at + i));
  const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(text);
  if (!m) return null;
  const date = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  return Number.isNaN(date.getTime()) || +m[1] < 1990 ? null : date;
}
