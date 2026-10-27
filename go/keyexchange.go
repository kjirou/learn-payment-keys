package main

// 鍵交換まわり: ZMK(Visa 文脈では ZCMK)による作業鍵の運搬と、鍵コンポーネントの合成。

// 作業鍵(ZPK など)を ZMK で暗号化する。「key under ZMK」と呼ばれる形。
// 相手組織へはこの形で渡し、平文の鍵がネットワークに出ないようにする。
func encryptKeyUnderZmk(zmk, key []byte) []byte { return tdesEncrypt(zmk, key) }

func decryptKeyUnderZmk(zmk, encryptedKey []byte) []byte { return tdesDecrypt(zmk, encryptedKey) }

// 鍵コンポーネント: ZMK を複数人が別々に保持する分割値の XOR で合成する。
// 1 人では鍵全体を知れないようにする運用(デュアルコントロール)の基本形。
func combineComponents(components ...[]byte) []byte {
	acc := components[0]
	for _, c := range components[1:] {
		acc = xor(acc, c)
	}
	return acc
}
