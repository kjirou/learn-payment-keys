package main

// 3DES / 単一 DES の薄いラッパーと、鍵まわりの小道具。
// 決済系のレガシー鍵は 2-key 3DES (K1,K2,K1) 16 バイトが基本単位。

import (
	"crypto/des"
	"encoding/hex"
	"strings"
)

func toHex(b []byte) string { return strings.ToUpper(hex.EncodeToString(b)) }

func unhex(s string) []byte {
	b, err := hex.DecodeString(strings.ReplaceAll(s, " ", ""))
	if err != nil {
		panic(err)
	}
	return b
}

// 2-key 3DES の 16 バイト鍵を、Go の API が求める 24 バイト (K1,K2,K1) に広げる。
func expandKey(key []byte) []byte {
	if len(key) != 16 {
		panic("tdes: key must be 16 bytes")
	}
	out := make([]byte, 24)
	copy(out, key)
	copy(out[16:], key[:8])
	return out
}

// 2-key 3DES ECB、パディングなし。data は 8 バイトの倍数。
func tdesEncrypt(key, data []byte) []byte {
	c, err := des.NewTripleDESCipher(expandKey(key))
	if err != nil {
		panic(err)
	}
	out := make([]byte, len(data))
	for i := 0; i < len(data); i += 8 {
		c.Encrypt(out[i:i+8], data[i:i+8])
	}
	return out
}

func tdesDecrypt(key, data []byte) []byte {
	c, err := des.NewTripleDESCipher(expandKey(key))
	if err != nil {
		panic(err)
	}
	out := make([]byte, len(data))
	for i := 0; i < len(data); i += 8 {
		c.Decrypt(out[i:i+8], data[i:i+8])
	}
	return out
}

// 単一 DES(8 バイト鍵)。CVK や Retail MAC の途中計算で使う。
func desEncrypt(key8, data []byte) []byte {
	c, err := des.NewCipher(key8)
	if err != nil {
		panic(err)
	}
	out := make([]byte, len(data))
	for i := 0; i < len(data); i += 8 {
		c.Encrypt(out[i:i+8], data[i:i+8])
	}
	return out
}

func desDecrypt(key8, data []byte) []byte {
	c, err := des.NewCipher(key8)
	if err != nil {
		panic(err)
	}
	out := make([]byte, len(data))
	for i := 0; i < len(data); i += 8 {
		c.Decrypt(out[i:i+8], data[i:i+8])
	}
	return out
}

func xor(a, b []byte) []byte {
	if len(a) != len(b) {
		panic("xor: length mismatch")
	}
	out := make([]byte, len(a))
	for i := range a {
		out[i] = a[i] ^ b[i]
	}
	return out
}

// KCV (Key Check Value): ゼロ 8 バイトを鍵で暗号化した先頭 3 バイト。
// 鍵の値そのものを見せずに「同じ鍵か」を確認するための値。
func kcv(key []byte) []byte {
	return tdesEncrypt(key, make([]byte, 8))[:3]
}

// DES 鍵の各バイトは最下位ビットがパリティビットで、奇数パリティに揃える慣習がある。
// DES 自体はこのビットを無視するので暗号結果は変わらない。
func adjustOddParity(key []byte) []byte {
	out := make([]byte, len(key))
	for i, b := range key {
		ones := 0
		for j := 1; j < 8; j++ {
			ones += int(b>>j) & 1
		}
		if ones%2 == 0 {
			out[i] = b | 1
		} else {
			out[i] = b &^ 1
		}
	}
	return out
}
