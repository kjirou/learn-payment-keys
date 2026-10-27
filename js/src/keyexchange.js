// 鍵交換まわり: ZMK(Visa 文脈では ZCMK)による作業鍵の運搬と、鍵コンポーネントの合成。
import { tdesEncrypt, tdesDecrypt, xor } from "./tdes.js";

// 作業鍵(ZPK など)を ZMK で暗号化する。「key under ZMK」と呼ばれる形。
// 相手組織へはこの形で渡し、平文の鍵がネットワークに出ないようにする。
export function encryptKeyUnderZmk(zmk, key) {
  return tdesEncrypt(zmk, key);
}

export function decryptKeyUnderZmk(zmk, encryptedKey) {
  return tdesDecrypt(zmk, encryptedKey);
}

// 鍵コンポーネント: ZMK を複数人が別々に保持する分割値の XOR で合成する。
// 1 人では鍵全体を知れないようにする運用(デュアルコントロール)の基本形。
export function combineComponents(...components) {
  return components.reduce((acc, c) => xor(acc, c));
}
