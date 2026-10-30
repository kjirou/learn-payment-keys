// デモ本体。docs/ の各章に対応する値を、ダミー鍵で順に計算して表示する。
// Go 版 (go/main.go) と同じ入力・同じ出力になるようにしてある。
import { hex, unhex, kcv } from "./tdes.js";
import { encryptKeyUnderZmk, decryptKeyUnderZmk, combineComponents } from "./keyexchange.js";
import {
  pinBlockFormat0, decodePinBlockFormat0, encryptPinBlock, decryptPinBlock,
  translatePinBlock, pvv,
} from "./pin.js";
import { cvv } from "./cvv.js";
import { deriveIccMasterKeyOptionA, deriveSessionKeyCsk, arqc, arpcMethod1 } from "./emv.js";

const show = (label, value) => console.log(`${label.padEnd(24)}: ${value}`);
const section = (title) => console.log(`\n== ${title} ==`);

// ---- ダミーの入力値(すべて架空) ----
const PAN = "4111111111111111";
const PSN = "00";
const PIN = "1234";

const ZMK_COMPONENT_1 = unhex("1111111111111111 2222222222222222");
const ZMK_COMPONENT_2 = unhex("1032547698BADCFE EFCDAB8967452301");
const ZPK_A = unhex("1A2B3C4D5E6F7081 92A3B4C5D6E7F808");
const ZPK_B = unhex("F1E2D3C4B5A69788 796A5B4C3D2E1F00");
const PVK = unhex("0123456789ABCDEF FEDCBA9876543210");
const PVKI = 1;
const CVK_A = unhex("0123456789ABCDEF");
const CVK_B = unhex("FEDCBA9876543210");
const EXPIRY = "2812";
const SERVICE_CODE = "201";
const IMK_AC = unhex("8A7B6C5D4E3F2019 1A2B3C4D5E6F7081");
const ATC = unhex("001C");
const ARC = unhex("3030"); // "00" = 承認

section("1. Key exchange (ZMK / ZCMK)");
const zmk = combineComponents(ZMK_COMPONENT_1, ZMK_COMPONENT_2);
show("ZMK component 1", hex(ZMK_COMPONENT_1));
show("ZMK component 2", hex(ZMK_COMPONENT_2));
show("ZMK (combined)", hex(zmk));
show("ZMK KCV", hex(kcv(zmk)));
show("ZPK_A (clear)", hex(ZPK_A));
show("ZPK_A KCV", hex(kcv(ZPK_A)));
const zpkAUnderZmk = encryptKeyUnderZmk(zmk, ZPK_A);
show("ZPK_A under ZMK", hex(zpkAUnderZmk));
show("ZPK_A (decrypted)", hex(decryptKeyUnderZmk(zmk, zpkAUnderZmk)));

section("2. PIN block (ISO 9564-1 Format 0) and translation");
show("PAN", PAN);
show("PIN", PIN);
const clearBlock = pinBlockFormat0(PIN, PAN);
show("Clear PIN block", hex(clearBlock));
const encA = encryptPinBlock(ZPK_A, clearBlock);
show("PIN block under ZPK_A", hex(encA));
const encB = translatePinBlock(ZPK_A, ZPK_B, encA);
show("PIN block under ZPK_B", hex(encB));
show("Decrypted with ZPK_B", hex(decryptPinBlock(ZPK_B, encB)));
show("Recovered PIN", decodePinBlockFormat0(decryptPinBlock(ZPK_B, encB), PAN));

section("3. PVV (Visa PIN Verification Value)");
show("PVK", hex(PVK));
show("PVKI", String(PVKI));
show("PVV", pvv(PVK, PAN, PVKI, PIN));

section("4. CVV");
show("CVK A", hex(CVK_A));
show("CVK B", hex(CVK_B));
show("Expiry (YYMM)", EXPIRY);
show("Service code", SERVICE_CODE);
show("CVV", cvv(CVK_A, CVK_B, PAN, EXPIRY, SERVICE_CODE));
show("iCVV (service 999)", cvv(CVK_A, CVK_B, PAN, EXPIRY, "999"));

section("5. EMV: IMK(MDK) -> ICC Master Key(UDK) -> session key -> ARQC / ARPC");
show("IMK_AC (MDK_AC)", hex(IMK_AC));
const mk = deriveIccMasterKeyOptionA(IMK_AC, PAN, PSN);
show("ICC MK_AC (Option A)", hex(mk));
show("ICC MK_AC KCV", hex(kcv(mk)));
show("ATC", hex(ATC));
const sk = deriveSessionKeyCsk(mk, ATC);
show("Session key (CSK)", hex(sk));
// CVN 18 の ARQC 入力データ(Visa の例に倣った並び。IAD の 3 バイト目 0x12 = CVN 18)
const txData = Buffer.concat([
  unhex("000000010000"), // Amount, Authorised (9F02)
  unhex("000000000000"), // Amount, Other (9F03)
  unhex("0392"),         // Terminal Country Code (9F1A)
  unhex("0000000000"),   // TVR (95)
  unhex("0392"),         // Transaction Currency Code (5F2A)
  unhex("261027"),       // Transaction Date (9A)
  unhex("00"),           // Transaction Type (9C)
  unhex("12345678"),     // Unpredictable Number (9F37)
  unhex("3800"),         // AIP (82)
  ATC,                   // ATC (9F36)
  unhex("06011203A0B800"), // Issuer Application Data (9F10)
]);
show("Transaction data", hex(txData));
const cryptogram = arqc(sk, txData);
show("ARQC", hex(cryptogram));
show("ARC", hex(ARC));
show("ARPC (method 1)", hex(arpcMethod1(sk, cryptogram, ARC)));
