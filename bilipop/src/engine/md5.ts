const S: number[] = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5,
  9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16,
  23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const K: number[] = Array.from({ length: 64 }, (_, i) =>
  Math.floor(2 ** 32 * Math.abs(Math.sin(i + 1))),
);

function rotl(value: number, bits: number): number {
  return (value << bits) | (value >>> (32 - bits));
}

function toHex(value: number): string {
  return (value >>> 0).toString(16).padStart(8, '0');
}

export function md5(message: string): string {
  const bytes = new TextEncoder().encode(message);
  const bitLen = bytes.length * 8;
  const paddedLen = ((((bytes.length + 8) >> 6) + 1) << 6) - 8;
  const buffer = new Uint8Array(paddedLen + 8);
  buffer.set(bytes);
  buffer[bytes.length] = 0x80;
  const view = new DataView(buffer.buffer);
  view.setUint32(buffer.length - 8, bitLen, true);
  view.setUint32(buffer.length - 4, Math.floor(bitLen / 2 ** 32), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let offset = 0; offset < buffer.length; offset += 64) {
    const m: number[] = [];
    for (let i = 0; i < 16; i++) {
      m.push(view.getUint32(offset + i * 4, true));
    }
    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;
    for (let i = 0; i < 64; i++) {
      let f: number;
      let g: number;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }
      const word = m[g];
      const shift = S[i];
      const sine = K[i];
      if (word === undefined || shift === undefined || sine === undefined) {
        throw new Error('MD5 table lookup failed');
      }
      const sum = (a + f + sine + word) >>> 0;
      const next = (b + rotl(sum, shift)) >>> 0;
      a = d;
      d = c;
      c = b;
      b = next;
    }
    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }

  return (
    toHex(((a0 & 0xff) << 24) | ((a0 & 0xff00) << 8) | ((a0 & 0xff0000) >>> 8) | (a0 >>> 24)) +
    toHex(((b0 & 0xff) << 24) | ((b0 & 0xff00) << 8) | ((b0 & 0xff0000) >>> 8) | (b0 >>> 24)) +
    toHex(((c0 & 0xff) << 24) | ((c0 & 0xff00) << 8) | ((c0 & 0xff0000) >>> 8) | (c0 >>> 24)) +
    toHex(((d0 & 0xff) << 24) | ((d0 & 0xff00) << 8) | ((d0 & 0xff0000) >>> 8) | (d0 >>> 24))
  );
}
