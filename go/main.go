package main

// デモ本体。docs/ の各章に対応する値を、ダミー鍵で順に計算して表示する。
// JS 版 (js/src/main.js) と同じ入力・同じ出力になるようにしてある。

import (
	"fmt"
	"strconv"
)

func show(label, value string) { fmt.Printf("%-24s: %s\n", label, value) }
func section(title string)     { fmt.Printf("\n== %s ==\n", title) }

func main() {
	// ---- ダミーの入力値(すべて架空) ----
	const PAN = "4111111111111111"
	const PSN = "00"
	const PIN = "1234"

	zmkComponent1 := unhex("1111111111111111 2222222222222222")
	zmkComponent2 := unhex("1032547698BADCFE EFCDAB8967452301")
	zpkA := unhex("1A2B3C4D5E6F7081 92A3B4C5D6E7F808")
	zpkB := unhex("F1E2D3C4B5A69788 796A5B4C3D2E1F00")
	pvk := unhex("0123456789ABCDEF FEDCBA9876543210")
	const pvki = 1
	cvkA := unhex("0123456789ABCDEF")
	cvkB := unhex("FEDCBA9876543210")
	const expiry = "2812"
	const serviceCode = "201"
	imkAC := unhex("8A7B6C5D4E3F2019 1A2B3C4D5E6F7081")
	atc := unhex("001C")
	arc := unhex("3030") // "00" = 承認

	section("1. Key exchange (ZMK / ZCMK)")
	zmk := combineComponents(zmkComponent1, zmkComponent2)
	show("ZMK component 1", toHex(zmkComponent1))
	show("ZMK component 2", toHex(zmkComponent2))
	show("ZMK (combined)", toHex(zmk))
	show("ZMK KCV", toHex(kcv(zmk)))
	show("ZPK_A (clear)", toHex(zpkA))
	show("ZPK_A KCV", toHex(kcv(zpkA)))
	zpkAUnderZmk := encryptKeyUnderZmk(zmk, zpkA)
	show("ZPK_A under ZMK", toHex(zpkAUnderZmk))
	show("ZPK_A (decrypted)", toHex(decryptKeyUnderZmk(zmk, zpkAUnderZmk)))

	section("2. PIN block (ISO 9564-1 Format 0) and translation")
	show("PAN", PAN)
	show("PIN", PIN)
	clearBlock := pinBlockFormat0(PIN, PAN)
	show("Clear PIN block", toHex(clearBlock))
	encA := encryptPinBlock(zpkA, clearBlock)
	show("PIN block under ZPK_A", toHex(encA))
	encB := translatePinBlock(zpkA, zpkB, encA)
	show("PIN block under ZPK_B", toHex(encB))
	show("Decrypted with ZPK_B", toHex(decryptPinBlock(zpkB, encB)))
	show("Recovered PIN", decodePinBlockFormat0(decryptPinBlock(zpkB, encB), PAN))

	section("3. PVV (Visa PIN Verification Value)")
	show("PVK", toHex(pvk))
	show("PVKI", strconv.Itoa(pvki))
	show("PVV", pvv(pvk, PAN, pvki, PIN))

	section("4. CVV")
	show("CVK A", toHex(cvkA))
	show("CVK B", toHex(cvkB))
	show("Expiry (YYMM)", expiry)
	show("Service code", serviceCode)
	show("CVV", cvv(cvkA, cvkB, PAN, expiry, serviceCode))
	show("iCVV (service 999)", cvv(cvkA, cvkB, PAN, expiry, "999"))

	section("5. EMV: IMK(MDK) -> ICC Master Key(UDK) -> session key -> ARQC / ARPC")
	show("IMK_AC (MDK_AC)", toHex(imkAC))
	mk := deriveIccMasterKeyOptionA(imkAC, PAN, PSN)
	show("ICC MK_AC (Option A)", toHex(mk))
	show("ICC MK_AC KCV", toHex(kcv(mk)))
	show("ATC", toHex(atc))
	sk := deriveSessionKeyCsk(mk, atc)
	show("Session key (CSK)", toHex(sk))
	// CVN 18 の ARQC 入力データ(Visa の例に倣った並び。IAD の 3 バイト目 0x12 = CVN 18)
	var txData []byte
	for _, part := range [][]byte{
		unhex("000000010000"),   // Amount, Authorised (9F02)
		unhex("000000000000"),   // Amount, Other (9F03)
		unhex("0392"),           // Terminal Country Code (9F1A)
		unhex("0000000000"),     // TVR (95)
		unhex("0392"),           // Transaction Currency Code (5F2A)
		unhex("261027"),         // Transaction Date (9A)
		unhex("00"),             // Transaction Type (9C)
		unhex("12345678"),       // Unpredictable Number (9F37)
		unhex("3800"),           // AIP (82)
		atc,                     // ATC (9F36)
		unhex("06011203A0B800"), // Issuer Application Data (9F10)
	} {
		txData = append(txData, part...)
	}
	show("Transaction data", toHex(txData))
	cryptogram := arqc(sk, txData)
	show("ARQC", toHex(cryptogram))
	show("ARC", toHex(arc))
	show("ARPC (method 1)", toHex(arpcMethod1(sk, cryptogram, arc)))
}
