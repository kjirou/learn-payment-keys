// CVV (Card Verification Value)。CVK A / CVK B の 2 本の単一 DES 鍵を使う。
import { desEncrypt, desDecrypt, unhex, hex, xor } from "./tdes.js";
import { decimalize } from "./pin.js";

// 入力 = PAN + 有効期限(YYMM) + サービスコード(3 桁) を 0 で 32 桁に右詰め。
// 手順:
//   B1, B2 = 先頭 8 バイト, 後ろ 8 バイト
//   T  = DES_A(B1)
//   T  = DES_A(T XOR B2)
//   T  = DES_B^-1(T)
//   T  = DES_A(T)
//   CVV = decimalize(T) の先頭 3 桁
export function cvv(cvkA, cvkB, pan, expiryYYMM, serviceCode) {
  const data = (pan + expiryYYMM + serviceCode).padEnd(32, "0");
  const b1 = unhex(data.slice(0, 16));
  const b2 = unhex(data.slice(16, 32));
  let t = desEncrypt(cvkA, b1);
  t = desEncrypt(cvkA, xor(t, b2));
  t = desDecrypt(cvkB, t);
  t = desEncrypt(cvkA, t);
  return decimalize(hex(t), 3);
}
