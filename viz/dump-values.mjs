// 可視化(viz/index.html)に埋め込む値を、リポジトリの JS 実装から計算して JSON で出す。
// 使い方: node viz/dump-values.mjs > values.json
const base = new URL("../js/src/", import.meta.url).href;
const { tdesEncrypt, tdesDecrypt, desEncrypt, desDecrypt, xor, hex, unhex, kcv, adjustOddParity } = await import(base + "tdes.js");
const { combineComponents, encryptKeyUnderZmk, decryptKeyUnderZmk } = await import(base + "keyexchange.js");
const { pinBlockFormat0, decodePinBlockFormat0, encryptPinBlock, decryptPinBlock, translatePinBlock, decimalize, pvv } = await import(base + "pin.js");
const { cvv } = await import(base + "cvv.js");
const { deriveIccMasterKeyOptionA, deriveSessionKeyCsk, retailMac, arqc, arpcMethod1 } = await import(base + "emv.js");

const H = (b) => hex(b);
const out = {};

// ---- 02 ----
const C1 = unhex("5A3C9E1B7D2F80C4 E6A10F9B3D57C2E8");
const C2 = unhex("C70B2D91F4A6E35B 08D9C6A2E71F4B36");
const ZMK = combineComponents(unhex("1111111111111111 2222222222222222"), unhex("1032547698BADCFE EFCDAB8967452301"));
const C3 = xor(xor(ZMK, C1), C2);
const ZPK_A = unhex("1A2B3C4D5E6F7081 92A3B4C5D6E7F808");
const ZPK_B = unhex("F1E2D3C4B5A69788 796A5B4C3D2E1F00");
const zpkAUnder = encryptKeyUnderZmk(ZMK, ZPK_A);
out.k02 = {
  ZMK: H(ZMK), ZMK_KCV: H(kcv(ZMK)),
  C1: H(C1), C1_KCV: H(kcv(C1)), C2: H(C2), C2_KCV: H(kcv(C2)), C3: H(C3), C3_KCV: H(kcv(C3)),
  C1xC2: H(xor(C1, C2)), restored: H(xor(xor(C1, C2), C3)),
  ZPK_A: H(ZPK_A), ZPK_A_KCV: H(kcv(ZPK_A)), ZPK_A_under_ZMK: H(zpkAUnder), ZPK_A_dec: H(decryptKeyUnderZmk(ZMK, zpkAUnder)),
  ZPK_B: H(ZPK_B), ZPK_B_KCV: H(kcv(ZPK_B)),
  zeros: "0000000000000000", kcv_full: H(tdesEncrypt(ZMK, Buffer.alloc(8))),
};

// ---- 03 ----
const PAN = "4111111111111111", PIN = "1234", PSN = "00";
const pinField = ("0" + PIN.length + PIN).padEnd(16, "F");
const panField = "0000" + PAN.slice(0, -1).slice(-12);
const clear = pinBlockFormat0(PIN, PAN);
const encA = encryptPinBlock(ZPK_A, clear);
const encB = translatePinBlock(ZPK_A, ZPK_B, encA);
const decB = decryptPinBlock(ZPK_B, encB);
const PVK = unhex("0123456789ABCDEF FEDCBA9876543210");
const PVKI = 1;
const tsp = PAN.slice(0, -1).slice(-11) + String(PVKI) + PIN.slice(0, 4);
const tspEnc = tdesEncrypt(PVK, unhex(tsp));
out.k03 = {
  PAN, PIN, pinField, panField, clear: H(clear),
  ZPK_A: H(ZPK_A), ZPK_B: H(ZPK_B), encA: H(encA), decA: H(decryptPinBlock(ZPK_A, encA)), encB: H(encB), decB: H(decB),
  recovered: decodePinBlockFormat0(decB, PAN),
  PVK: H(PVK), PVKI, tsp, tspEnc: H(tspEnc), tspDec: decimalize(H(tspEnc), 16), PVV: pvv(PVK, PAN, PVKI, PIN),
};

// ---- 04 ----
const IMK = unhex("8A7B6C5D4E3F2019 1A2B3C4D5E6F7081");
const ATC = unhex("001C");
const ARC = unhex("3030");
const y = unhex((PAN + PSN).slice(-16));
const yInv = xor(y, Buffer.alloc(8, 0xff));
const zl = tdesEncrypt(IMK, y), zr = tdesEncrypt(IMK, yInv);
const MK = deriveIccMasterKeyOptionA(IMK, PAN, PSN);
const r = Buffer.alloc(8); ATC.copy(r, 0);
const rl = Buffer.from(r); rl[2] = 0xf0;
const rr = Buffer.from(r); rr[2] = 0x0f;
const skl = tdesEncrypt(MK, rl), skr = tdesEncrypt(MK, rr);
const SK = deriveSessionKeyCsk(MK, ATC);
const txParts = [
  ["9F02", "Amount, Authorised", "000000010000"],
  ["9F03", "Amount, Other", "000000000000"],
  ["9F1A", "Terminal Country Code", "0392"],
  ["95", "TVR", "0000000000"],
  ["5F2A", "Transaction Currency Code", "0392"],
  ["9A", "Transaction Date", "261027"],
  ["9C", "Transaction Type", "00"],
  ["9F37", "Unpredictable Number", "12345678"],
  ["82", "AIP", "3800"],
  ["9F36", "ATC", H(ATC)],
  ["9F10", "IAD", "06011203A0B800"],
];
const tx = Buffer.concat(txParts.map((p) => unhex(p[2])));
// Retail MAC の途中値
const kl = SK.subarray(0, 8), kr = SK.subarray(8, 16);
const padded = Buffer.concat([tx, Buffer.from([0x80])]);
const padLen = (8 - (padded.length % 8)) % 8;
const msg = Buffer.concat([padded, Buffer.alloc(padLen)]);
const chain = [];
let h = Buffer.alloc(8);
for (let i = 0; i < msg.length; i += 8) { h = desEncrypt(kl, xor(h, msg.subarray(i, i + 8))); chain.push(H(h)); }
const macDec = desDecrypt(kr, h);
const ARQC = arqc(SK, tx);
const pad = Buffer.alloc(8); ARC.copy(pad, 0);
const ARPC = arpcMethod1(SK, ARQC, ARC);
out.k04 = {
  IMK: H(IMK), PAN, PSN, panPsn: PAN + PSN, Y: H(y), Yinv: H(yInv), ZL: H(zl), ZR: H(zr), ZLZR: H(Buffer.concat([zl, zr])), MK: H(MK), MK_KCV: H(kcv(MK)),
  ATC: H(ATC), R: H(r), RL: H(rl), RR: H(rr), SKL: H(skl), SKR: H(skr), SKLSKR: H(Buffer.concat([skl, skr])), SK: H(SK), SK_KCV: H(kcv(SK)),
  txParts, tx: H(tx), txLen: tx.length, msg: H(msg), msgBlocks: msg.length / 8, chain, macDec: H(macDec), ARQC: H(ARQC),
  ARC: H(ARC), arcPad: H(pad), arqcXor: H(xor(ARQC, pad)), ARPC: H(ARPC),
};

// ---- 05 ----
const CVK_A = unhex("0123456789ABCDEF"), CVK_B = unhex("FEDCBA9876543210");
const EXPIRY = "2812";
function cvvSteps(serviceCode) {
  const data = (PAN + EXPIRY + serviceCode).padEnd(32, "0");
  const b1 = unhex(data.slice(0, 16)), b2 = unhex(data.slice(16, 32));
  const t1 = desEncrypt(CVK_A, b1);
  const t2 = desEncrypt(CVK_A, xor(t1, b2));
  const t3 = desDecrypt(CVK_B, t2);
  const t4 = desEncrypt(CVK_A, t3);
  return { serviceCode, data, B1: H(b1), B2: H(b2), T1: H(t1), T1xB2: H(xor(t1, b2)), T2: H(t2), T3: H(t3), T4: H(t4), dec: decimalize(H(t4), 16), CVV: cvv(CVK_A, CVK_B, PAN, EXPIRY, serviceCode) };
}
out.k05 = { CVK_A: H(CVK_A), CVK_B: H(CVK_B), PAN, EXPIRY, cvv: cvvSteps("201"), icvv: cvvSteps("999") };

console.log(JSON.stringify(out, null, 2));
