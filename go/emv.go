package main

// EMV 系: IMK(Visa では MDK) → ICC Master Key(Visa では UDK) → セッション鍵 → ARQC / ARPC。

import "bytes"

// EMV Book 2 Annex A1.4.1 Option A による ICC Master Key(MK。Visa では UDK)の派生。
//
//	Y  = (PAN || PSN) の右 16 桁
//	ZL = 3DES_IMK(Y)
//	ZR = 3DES_IMK(Y XOR FF..FF)
//	MK = 奇数パリティ調整(ZL || ZR)
func deriveIccMasterKeyOptionA(imk []byte, pan, psn string) []byte {
	s := pan + psn
	y := unhex(s[len(s)-16:])
	zl := tdesEncrypt(imk, y)
	zr := tdesEncrypt(imk, xor(y, bytes.Repeat([]byte{0xFF}, 8)))
	return adjustOddParity(append(zl, zr...))
}

// EMV Book 2 Annex A1.3 Common Session Key 派生(Visa CVN 18 などが使う)。
//
//	R   = ATC(2) || 00 || 00 || 00 00 00 00
//	SKL = 3DES_MK(ATC || F0 || 00 || 00 00 00 00)
//	SKR = 3DES_MK(ATC || 0F || 00 || 00 00 00 00)
func deriveSessionKeyCsk(mk, atc []byte) []byte {
	rl := make([]byte, 8)
	copy(rl, atc)
	rr := make([]byte, 8)
	copy(rr, atc)
	rl[2] = 0xF0
	rr[2] = 0x0F
	return adjustOddParity(append(tdesEncrypt(mk, rl), tdesEncrypt(mk, rr)...))
}

// ISO/IEC 9797-1 MAC Algorithm 3 (Retail MAC)、パディング方式 2 (80 00 ...)。
// 全ブロックを左鍵の単一 DES CBC で回し、最後だけ右鍵で復号→左鍵で暗号化。
func retailMac(key, data []byte) []byte {
	kl, kr := key[:8], key[8:16]
	msg := append(append([]byte{}, data...), 0x80)
	for len(msg)%8 != 0 {
		msg = append(msg, 0x00)
	}
	h := make([]byte, 8)
	for i := 0; i < len(msg); i += 8 {
		h = desEncrypt(kl, xor(h, msg[i:i+8]))
	}
	return desEncrypt(kl, desDecrypt(kr, h))
}

// ARQC = セッション鍵で取引データに Retail MAC をかけたもの(8 バイト)。
func arqc(sessionKey, transactionData []byte) []byte {
	return retailMac(sessionKey, transactionData)
}

// ARPC 方式 1: 3DES_SK(ARQC XOR (ARC || 00 00 00 00 00 00))。
// イシュアが「この ARQC を見た上で承認/否認した」ことをカードに証明する。
func arpcMethod1(sessionKey, arqcValue, arc []byte) []byte {
	pad := make([]byte, 8)
	copy(pad, arc)
	return tdesEncrypt(sessionKey, xor(arqcValue, pad))
}
