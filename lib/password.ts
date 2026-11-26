/**
 * Password hashing for the browser-only demo.
 *
 * Plain SHA-256 written out rather than `crypto.subtle`, because subtle only
 * exists on https or localhost — and the accounting team will open the dev
 * build on their phones over the office network, which is plain http.
 *
 * This keeps passwords out of localStorage as readable text. It is NOT
 * security: anyone with the browser can edit the stored accounts. Real sign-in
 * arrives with the backend, which will hash with a slow, server-side function.
 */

const K = Array.from({ length: 64 }, (_, i) => frac(Math.cbrt(prime(i))));
const H0 = Array.from({ length: 8 }, (_, i) => frac(Math.sqrt(prime(i))));

function prime(n: number): number {
  let count = -1;
  for (let p = 2; ; p++) {
    let isPrime = true;
    for (let d = 2; d * d <= p; d++) if (p % d === 0) { isPrime = false; break; }
    if (isPrime && ++count === n) return p;
  }
}

/** First 32 bits of the fractional part — how SHA-256 derives its constants. */
function frac(x: number): number {
  return ((x - Math.floor(x)) * 0x100000000) | 0;
}

const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

export function sha256(message: string): string {
  const bytes = new TextEncoder().encode(message);
  const padded = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  const bits = bytes.length * 8;
  view.setUint32(padded.length - 8, Math.floor(bits / 0x100000000));
  view.setUint32(padded.length - 4, bits >>> 0);

  const h = [...H0];
  const w = new Array<number>(64);

  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4) | 0;
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }

    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 =
        (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }

    h[0] = (h[0] + a) | 0;
    h[1] = (h[1] + b) | 0;
    h[2] = (h[2] + c) | 0;
    h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0;
    h[5] = (h[5] + f) | 0;
    h[6] = (h[6] + g) | 0;
    h[7] = (h[7] + hh) | 0;
  }

  return h.map((x) => (x >>> 0).toString(16).padStart(8, "0")).join("");
}

/** A short random salt, so two people with the same password differ. */
export const newSalt = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const hashPassword = (password: string, salt: string) =>
  sha256(`${salt}:${password}`);

export const MIN_PASSWORD = 8;
