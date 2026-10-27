package main

// PIN 系: ISO 9564-1 Format 0 の PIN ブロック、ZPK による暗号化と変換、Visa PVV。

import (
	"strconv"
	"strings"
)

// PAN からチェックデジット(末尾 1 桁)を除いた右側 n 桁。
func panDigits(pan string, n int) string {
	withoutCheck := pan[:len(pan)-1]
	return withoutCheck[len(withoutCheck)-n:]
}

// ISO 9564-1 Format 0 (ISO-0): PIN フィールド XOR PAN フィールド。
//
//	PIN フィールド : "0" + PIN 長(1 桁) + PIN + "F" で 16 桁まで埋める
//	PAN フィールド : "0000" + PAN(チェックデジット除く)の右 12 桁
func pinBlockFormat0(pin, pan string) []byte {
	if len(pin) < 4 || len(pin) > 12 {
		panic("pin length")
	}
	pinField := "0" + strconv.Itoa(len(pin)) + pin
	pinField += strings.Repeat("F", 16-len(pinField))
	panField := "0000" + panDigits(pan, 12)
	return xor(unhex(pinField), unhex(panField))
}

func decodePinBlockFormat0(block []byte, pan string) string {
	panField := unhex("0000" + panDigits(pan, 12))
	pinField := toHex(xor(block, panField))
	if pinField[0] != '0' {
		panic("not format 0")
	}
	n, _ := strconv.ParseInt(pinField[1:2], 16, 0)
	return pinField[2 : 2+n]
}

// 平文 PIN ブロックを ZPK(または TPK)で暗号化する。
func encryptPinBlock(zpk, clearBlock []byte) []byte { return tdesEncrypt(zpk, clearBlock) }

func decryptPinBlock(zpk, encBlock []byte) []byte { return tdesDecrypt(zpk, encBlock) }

// PIN 変換(PIN translation): スイッチが「アクワイアラとの ZPK」で復号し
// 「イシュアとの ZPK」で暗号化し直す。HSM 内で行い、平文 PIN を外に出さない。
func translatePinBlock(fromZpk, toZpk, encBlock []byte) []byte {
	return tdesEncrypt(toZpk, tdesDecrypt(fromZpk, encBlock))
}

// 16 進文字列を 10 進数字列に「デシマライズ」する(CVV/PVV 共通の手順)。
//
//	1 周目: 0-9 の文字をそのまま拾う
//	2 周目: A-F の文字を 0-5 に読み替えて拾う
func decimalize(hexStr string, n int) string {
	var sb strings.Builder
	for _, c := range hexStr {
		if c >= '0' && c <= '9' {
			sb.WriteRune(c)
		}
	}
	for _, c := range hexStr {
		if c >= 'A' && c <= 'F' {
			sb.WriteRune('0' + (c - 'A'))
		}
	}
	return sb.String()[:n]
}

// Visa PVV (PIN Verification Value)。PVK で TSP を暗号化し 4 桁にデシマライズ。
//
//	TSP = PAN(チェックデジット除く)の右 11 桁 + PVKI(1 桁) + PIN の先頭 4 桁
func pvv(pvk []byte, pan string, pvki int, pin string) string {
	tsp := panDigits(pan, 11) + strconv.Itoa(pvki) + pin[:4]
	return decimalize(toHex(tdesEncrypt(pvk, unhex(tsp))), 4)
}
