import crypto from 'crypto';

// copy of md5Hex from _utils.js
function md5Hex(str) {
  const data = new TextEncoder().encode(str);
  const s = [
    7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21,
    5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21, 7, 12, 17, 22,
    4, 11, 16, 23, 6, 10, 15, 21, 7, 12, 17, 22, 5, 9, 14, 20,
    6, 10, 15, 21, 7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23
  ];
  const K = new Uint32Array(64);
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32);
  const bytes = new Uint8Array(((data.length + 8) >> 6) + 1 << 6);
  bytes.set(data);
  bytes[data.length] = 0x80;
  const bitLen = data.length * 8;
  bytes[bytes.length - 8] = bitLen & 0xff;
  bytes[bytes.length - 7] = (bitLen >>> 8) & 0xff;
  bytes[bytes.length - 6] = (bitLen >>> 16) & 0xff;
  bytes[bytes.length - 5] = (bitLen >>> 24) & 0xff;
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let i = 0; i < bytes.length; i += 64) {
    const M = new Uint32Array(16);
    for (let j = 0; j < 16; j++) {
      M[j] = bytes[i + j * 4] | (bytes[i + j * 4 + 1] << 8) | (bytes[i + j * 4 + 2] << 16) | (bytes[i + j * 4 + 3] << 24);
    }
    let A = a0, B = b0, C = c0, D = d0;
    for (let j = 0; j < 64; j++) {
      let F, g;
      if (j < 16) { F = (B & C) | (~B & D); g = j; }
      else if (j < 32) { F = (D & B) | (~D & C); g = (5 * j + 1) % 16; }
      else if (j < 48) { F = B ^ C ^ D; g = (3 * j + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * j) % 16; }
      const tmp = D;
      D = C; C = B;
      B = (B + (((A + F + K[j] + M[g]) >>> 0) << s[j] | ((A + F + K[j] + M[g]) >>> 0) >>> (32 - s[j]))) >>> 0;
      A = tmp;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  const out = new Uint8Array(16);
  const words = [a0, b0, c0, d0];
  for (let i = 0; i < 4; i++) {
    out[i * 4] = words[i] & 0xff;
    out[i * 4 + 1] = (words[i] >>> 8) & 0xff;
    out[i * 4 + 2] = (words[i] >>> 16) & 0xff;
    out[i * 4 + 3] = (words[i] >>> 24) & 0xff;
  }
  return Array.from(out).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const str = 'money=0.30&name=ping&notify_url=https://www.laohaoba.com/api/payment/epay188-notify&out_trade_no=TEST123&pid=46603f7a-4e86-4e8a-bd23-422a3a18d393&return_url=https://www.laohaoba.com/order/search.html&sign_type=MD5&type=usdt';
const secret = '6b41428e8f66da221684e04a4360b6c2';
console.log('custom', md5Hex(str + secret));
console.log('node  ', crypto.createHash('md5').update(str + secret).digest('hex'));
