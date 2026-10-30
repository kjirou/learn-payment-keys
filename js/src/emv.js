// EMV 系: IMK(Visa では MDK) → ICC Master Key(Visa では UDK) → セッション鍵 → ARQC / ARPC。
import { tdesEncrypt, desEncrypt, desDecrypt, xor, unhex, adjustOddParity } from "./tdes.js";

// EMV Book 2 Annex A1.4.1 Option A による ICC Master Key(MK。Visa では UDK)の派生。
//   Y  = (PAN || PSN) の右 16 桁
//   ZL = 3DES_IMK(Y)
//   ZR = 3DES_IMK(Y XOR FF..FF)
//   MK = 奇数パリティ調整(ZL || ZR)
export function deriveIccMasterKeyOptionA(imk, pan, psn) {
  const y = unhex((pan + psn).slice(-16));
  const zl = tdesEncrypt(imk, y);
  const zr = tdesEncrypt(imk, xor(y, Buffer.alloc(8, 0xff)));
  return adjustOddParity(Buffer.concat([zl, zr]));
}

// EMV Book 2 Annex A1.3 Common Session Key 派生(Visa CVN 18 などが使う)。
//   R   = ATC(2) || 00 || 00 || 00 00 00 00
//   SKL = 3DES_MK(ATC || F0 || 00 || 00 00 00 00)
//   SKR = 3DES_MK(ATC || 0F || 00 || 00 00 00 00)
export function deriveSessionKeyCsk(mk, atc) {
  const r = Buffer.alloc(8);
  atc.copy(r, 0);
  const rl = Buffer.from(r);
  rl[2] = 0xf0;
  const rr = Buffer.from(r);
  rr[2] = 0x0f;
  return adjustOddParity(Buffer.concat([tdesEncrypt(mk, rl), tdesEncrypt(mk, rr)]));
}

// ISO/IEC 9797-1 MAC Algorithm 3 (Retail MAC)、パディング方式 2 (80 00 ...)。
// 全ブロックを左鍵の単一 DES CBC で回し、最後だけ右鍵で復号→左鍵で暗号化。
export function retailMac(key, data) {
  const kl = key.subarray(0, 8);
  const kr = key.subarray(8, 16);
  const padded = Buffer.concat([data, Buffer.from([0x80])]);
  const padLen = (8 - (padded.length % 8)) % 8;
  const msg = Buffer.concat([padded, Buffer.alloc(padLen)]);
  let h = Buffer.alloc(8);
  for (let i = 0; i < msg.length; i += 8) {
    h = desEncrypt(kl, xor(h, msg.subarray(i, i + 8)));
  }
  return desEncrypt(kl, desDecrypt(kr, h));
}

// ARQC = セッション鍵で取引データに Retail MAC をかけたもの(8 バイト)。
export function arqc(sessionKey, transactionData) {
  return retailMac(sessionKey, transactionData);
}

// ARPC 方式 1: 3DES_SK(ARQC XOR (ARC || 00 00 00 00 00 00))。
// イシュアが「この ARQC を見た上で承認/否認した」ことをカードに証明する。
export function arpcMethod1(sessionKey, arqcValue, arc) {
  const pad = Buffer.alloc(8);
  arc.copy(pad, 0);
  return tdesEncrypt(sessionKey, xor(arqcValue, pad));
}
