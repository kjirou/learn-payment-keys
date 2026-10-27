// 3DES / 単一 DES の薄いラッパーと、鍵まわりの小道具。
// 決済系のレガシー鍵は 2-key 3DES (K1,K2,K1) 16 バイトが基本単位。
import { createCipheriv, createDecipheriv } from "node:crypto";

export const hex = (buf) => Buffer.from(buf).toString("hex").toUpperCase();
export const unhex = (s) => Buffer.from(s.replace(/\s+/g, ""), "hex");

// 2-key 3DES ECB、パディングなし。key は 16 バイト、data は 8 バイトの倍数。
export function tdesEncrypt(key, data) {
  const c = createCipheriv("des-ede", key, null);
  c.setAutoPadding(false);
  return Buffer.concat([c.update(data), c.final()]);
}

export function tdesDecrypt(key, data) {
  const d = createDecipheriv("des-ede", key, null);
  d.setAutoPadding(false);
  return Buffer.concat([d.update(data), d.final()]);
}

// 単一 DES。Node(OpenSSL 3)は des-ecb を既定で提供しないため、
// K1 == K2 の 3DES として計算する(E_K(D_K(E_K(x))) = E_K(x))。
export function desEncrypt(key8, data) {
  return tdesEncrypt(Buffer.concat([key8, key8]), data);
}

export function desDecrypt(key8, data) {
  return tdesDecrypt(Buffer.concat([key8, key8]), data);
}

export function xor(a, b) {
  if (a.length !== b.length) throw new Error("xor: length mismatch");
  return Buffer.from(a.map((v, i) => v ^ b[i]));
}

// KCV (Key Check Value): ゼロ 8 バイトを鍵で暗号化した先頭 3 バイト。
// 鍵の値そのものを見せずに「同じ鍵か」を確認するための値。
export function kcv(key) {
  return tdesEncrypt(key, Buffer.alloc(8)).subarray(0, 3);
}

// DES 鍵の各バイトは最下位ビットがパリティビットで、奇数パリティに揃える慣習がある。
// DES 自体はこのビットを無視するので暗号結果は変わらない。
export function adjustOddParity(key) {
  return Buffer.from(
    key.map((b) => {
      let ones = 0;
      for (let i = 1; i < 8; i++) ones += (b >> i) & 1;
      return ones % 2 === 0 ? b | 1 : b & 0xfe;
    }),
  );
}
