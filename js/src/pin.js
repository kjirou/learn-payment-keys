// PIN 系: ISO 9564-1 Format 0 の PIN ブロック、ZPK による暗号化と変換、Visa PVV。
import { tdesEncrypt, tdesDecrypt, unhex, hex } from "./tdes.js";

// PAN からチェックデジット(末尾 1 桁)を除いた右側 n 桁。
function panDigits(pan, n) {
  const withoutCheck = pan.slice(0, -1);
  return withoutCheck.slice(-n);
}

// ISO 9564-1 Format 0 (ISO-0): PIN フィールド XOR PAN フィールド。
//   PIN フィールド : "0" + PIN 長(1 桁) + PIN + "F" で 16 桁まで埋める
//   PAN フィールド : "0000" + PAN(チェックデジット除く)の右 12 桁
export function pinBlockFormat0(pin, pan) {
  if (pin.length < 4 || pin.length > 12) throw new Error("pin length");
  const pinField = ("0" + pin.length + pin).padEnd(16, "F");
  const panField = "0000" + panDigits(pan, 12);
  const a = unhex(pinField);
  const b = unhex(panField);
  return Buffer.from(a.map((v, i) => v ^ b[i]));
}

export function decodePinBlockFormat0(block, pan) {
  const panField = unhex("0000" + panDigits(pan, 12));
  const pinField = hex(Buffer.from(block.map((v, i) => v ^ panField[i])));
  if (pinField[0] !== "0") throw new Error("not format 0");
  const len = parseInt(pinField[1], 16);
  return pinField.slice(2, 2 + len);
}

// 平文 PIN ブロックを ZPK(または TPK)で暗号化する。
export function encryptPinBlock(zpk, clearBlock) {
  return tdesEncrypt(zpk, clearBlock);
}

export function decryptPinBlock(zpk, encBlock) {
  return tdesDecrypt(zpk, encBlock);
}

// PIN 変換(PIN translation): スイッチが「アクワイアラとの ZPK」で復号し
// 「イシュアとの ZPK」で暗号化し直す。HSM 内で行い、平文 PIN を外に出さない。
export function translatePinBlock(fromZpk, toZpk, encBlock) {
  return tdesEncrypt(toZpk, tdesDecrypt(fromZpk, encBlock));
}

// 16 進文字列を 10 進数字列に「デシマライズ」する(CVV/PVV 共通の手順)。
//   1 周目: 0-9 の文字をそのまま拾う
//   2 周目: A-F の文字を 0-5 に読み替えて拾う
export function decimalize(hexStr, n) {
  let out = "";
  for (const c of hexStr) if (c >= "0" && c <= "9") out += c;
  for (const c of hexStr) if (c >= "A" && c <= "F") out += String(c.charCodeAt(0) - 65);
  return out.slice(0, n);
}

// Visa PVV (PIN Verification Value)。PVK で TSP を暗号化し 4 桁にデシマライズ。
//   TSP = PAN(チェックデジット除く)の右 11 桁 + PVKI(1 桁) + PIN の先頭 4 桁
export function pvv(pvk, pan, pvki, pin) {
  const tsp = panDigits(pan, 11) + String(pvki) + pin.slice(0, 4);
  const enc = tdesEncrypt(pvk, unhex(tsp));
  return decimalize(hex(enc), 4);
}
