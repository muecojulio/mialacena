/**
 * Minimal ZIP writer (store method, no compression).
 *
 * SheetJS/ExcelJS are not installed and a native zip module can't compile here,
 * so we emit the container by hand. Entries are STORED (method 0), which the
 * OOXML spec allows — Excel, LibreOffice, Numbers and Google Sheets all read
 * stored parts fine. That keeps the only real work at CRC-32.
 */

const TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = TABLE[(crc ^ bytes[i]!) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export type ZipEntry = { name: string; data: string };

/** DOS date for 1980-01-01 — a fixed timestamp keeps builds reproducible. */
const DOS_DATE = (0 << 9) | (1 << 5) | 1;
const UTF8_FLAG = 0x0800;

export function zipStore(entries: ZipEntry[], mimeType: string): Blob {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const data = encoder.encode(entry.data);
    const crc = crc32(data);

    const local = new Uint8Array(30 + name.length + data.length);
    const lh = new DataView(local.buffer);
    lh.setUint32(0, 0x04034b50, true); // local file header signature
    lh.setUint16(4, 20, true); // version needed to extract
    lh.setUint16(6, UTF8_FLAG, true);
    lh.setUint16(8, 0, true); // stored
    lh.setUint16(10, 0, true); // mod time
    lh.setUint16(12, DOS_DATE, true);
    lh.setUint32(14, crc, true);
    lh.setUint32(18, data.length, true); // compressed size
    lh.setUint32(22, data.length, true); // uncompressed size
    lh.setUint16(26, name.length, true);
    lh.setUint16(28, 0, true); // extra field length
    local.set(name, 30);
    local.set(data, 30 + name.length);
    parts.push(local);

    const cd = new Uint8Array(46 + name.length);
    const ch = new DataView(cd.buffer);
    ch.setUint32(0, 0x02014b50, true); // central directory signature
    ch.setUint16(4, 20, true); // version made by
    ch.setUint16(6, 20, true); // version needed
    ch.setUint16(8, UTF8_FLAG, true);
    ch.setUint16(10, 0, true); // stored
    ch.setUint16(12, 0, true);
    ch.setUint16(14, DOS_DATE, true);
    ch.setUint32(16, crc, true);
    ch.setUint32(20, data.length, true);
    ch.setUint32(24, data.length, true);
    ch.setUint16(28, name.length, true);
    ch.setUint16(30, 0, true); // extra
    ch.setUint16(32, 0, true); // comment
    ch.setUint16(34, 0, true); // disk number start
    ch.setUint16(36, 0, true); // internal attributes
    ch.setUint32(38, 0, true); // external attributes
    ch.setUint32(42, offset, true); // relative offset of local header
    cd.set(name, 46);
    central.push(cd);

    offset += local.length;
  }

  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const eh = new DataView(end.buffer);
  eh.setUint32(0, 0x06054b50, true); // end of central directory signature
  eh.setUint16(4, 0, true);
  eh.setUint16(6, 0, true);
  eh.setUint16(8, entries.length, true);
  eh.setUint16(10, entries.length, true);
  eh.setUint32(12, centralSize, true);
  eh.setUint32(16, offset, true);
  eh.setUint16(20, 0, true); // comment length

  const chunks = [...parts, ...central, end];
  const out = new Uint8Array(chunks.reduce((sum, part) => sum + part.length, 0));
  let cursor = 0;
  for (const chunk of chunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }
  return new Blob([out], { type: mimeType });
}
