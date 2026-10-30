# learn-payment-keys

クレジットカード決済の文脈に登場する暗号鍵(ZMK/ZCMK, ZPK, IWK/AWK, PVK, CVK, IMK/MDK, ICC Master Key/UDK, セッション鍵 など)の仕様を、個人の学習目的でまとめたリポジトリです。

- `docs/` に仕様のノート(日本語)
- `js/` と `go/` に、同じダミー鍵・同じ入力で同じ結果を出す最小限のサンプル実装
- Docker 経由で実行でき、両言語の出力を `diff` で相互検証できる

## 注意

- Visa、Mastercard、EMVCo、HSM ベンダー等とは一切関係のない個人の学習ノートです。
- 鍵・PAN・取引データはすべてダミーです。実環境の鍵や会員限定資料の内容は含めていません。
- 実装は学習用の最小構成で、HSM の鍵ブロックやバリアント、パディング攻撃対策などは省略しています。本番用途には使わないでください。

## 使い方

Docker と Docker Compose が必要です。

```sh
make js      # JS 版のデモを実行
make go      # Go 版のデモを実行
make check   # 両方を実行して出力を diff(差分なしなら OK)
```

直接 `docker compose run --rm js` / `docker compose run --rm go` でも動きます。

## ドキュメント

| ファイル | 内容 |
|---|---|
| [docs/00-overview.md](docs/00-overview.md) | 全体像。鍵階層の 2 本の木と、一般名と Visa / HSM ベンダー名の対応表 |
| [docs/01-crypto-basics.md](docs/01-crypto-basics.md) | 前提知識: DES / 3DES, ECB, 単一 DES との関係, `3DES_key( data )` 記法の読み方 |
| [docs/02-key-exchange.md](docs/02-key-exchange.md) | 鍵交換: LMK, ZMK(ZCMK), 鍵コンポーネント, KCV, key-under-key, TR-31 |
| [docs/03-pin-keys.md](docs/03-pin-keys.md) | PIN 系: ZPK/TPK/IWK/AWK, ISO 9564 PIN ブロック, PIN 変換, PVK/PVV |
| [docs/04-emv-keys.md](docs/04-emv-keys.md) | EMV 系: IMK(MDK), ICC Master Key(UDK) の派生, セッション鍵, ARQC/ARPC |
| [docs/05-cvv.md](docs/05-cvv.md) | カード検証値: CVK と CVV/iCVV/CVV2 |
| [docs/glossary.md](docs/glossary.md) | 略語集 |
| [docs/references.md](docs/references.md) | 参照した規格・資料 |

## サンプル実装の対応

| 処理 | JS | Go |
|---|---|---|
| 3DES / 単一 DES / KCV / パリティ調整 | `js/src/tdes.js` | `go/tdes.go` |
| ZMK による鍵の暗号化・復号、コンポーネント合成 | `js/src/keyexchange.js` | `go/keyexchange.go` |
| ISO 9564 Format 0 PIN ブロック、PIN 変換、PVV | `js/src/pin.js` | `go/pin.go` |
| CVV | `js/src/cvv.js` | `go/cvv.go` |
| ICC Master Key 派生、セッション鍵、ARQC、ARPC | `js/src/emv.js` | `go/emv.go` |
| デモ本体 | `js/src/main.js` | `go/main.go` |
