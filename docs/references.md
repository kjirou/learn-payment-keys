# 参照した規格・資料

## 無償で読めるもの

- **EMV Book 2: Security and Key Management** (EMVCo) — IMK / ICC Master Key の派生(Annex A1.4)、セッション鍵(Annex A1.3)、ARQC / ARPC(8 章)、Retail MAC(Annex A1.2)。https://www.emvco.com/specifications/ (登録のうえ無償でダウンロードできる。現行は 4.4 系)
- **EMV Book 3: Application Specification** — CDOL、IAD などデータ要素の定義。

### EMV 仕様書の構成と、本リポジトリが参照する節

EMV は EMVCo が発行する IC カード決済の国際仕様で、名前は Europay、Mastercard、Visa の頭文字に由来する。本体は 4 冊に分かれている。

| 巻 | 題名 | 内容 |
|---|---|---|
| Book 1 | Application Independent ICC to Terminal Interface Requirements | カードと端末の物理・電気・通信プロトコル |
| Book 2 | Security and Key Management | 鍵管理、クリプトグラム、オフライン認証(RSA)、セキュアメッセージング |
| Book 3 | Application Specification | 取引フロー、データ要素(タグ)、コマンド |
| Book 4 | Cardholder, Attendant, and Acquirer Interface Requirements | 端末の UI や加盟店・アクワイアラとの要件 |

本リポジトリが扱うのはほぼ Book 2 で、参照する節は次のとおり。「EMV Book 2 Annex A1.4.1 Option A」のような表記は、この階層をたどった参照である。

| 節 | 内容 | 本リポジトリでの対応 |
|---|---|---|
| 8 章 Application Cryptogram | ARQC / TC / AAC の生成と、ARPC の生成・検証 | `docs/04-emv-keys.md` の ARQC、ARPC |
| 9 章 Secure Messaging | 発行者スクリプトの MAC と暗号化 | `docs/04-emv-keys.md` の発行者スクリプト |
| Annex A Security Mechanisms | アルゴリズムの具体的手順をまとめた付録 | - |
| Annex A1 Symmetric Mechanisms | 対称鍵(DES / 3DES、AES)を使う機構 | - |
| Annex A1.1 Encipherment | ブロック暗号による暗号化 | `docs/01-crypto-basics.md` |
| Annex A1.2 MAC | Retail MAC(ISO/IEC 9797-1 Algorithm 3) | `retailMac` |
| Annex A1.3 Session Key Derivation | Common Session Key の派生 | `deriveSessionKeyCsk` |
| Annex A1.4 Master Key Derivation | ICC Master Key の派生 | `deriveIccMasterKeyOptionA` |
| Annex A1.4.1 Option A | PAN \|\| PSN の右 16 桁を 3DES する方式 | 実装済み |
| Annex A1.4.2 Option B | PAN \|\| PSN を SHA-1 でハッシュしデシマライズしてから Option A と同じ計算をする方式。PAN が 16 桁を超える場合向け | 未実装 |
| Annex A1.4.3 Option C | AES 版の派生方式(新しい版で追加) | 未実装 |
| Annex A2 Asymmetric Mechanisms | RSA によるオフラインデータ認証(SDA / DDA / CDA) | 扱わない |

節番号や Annex の構成は版によってわずかに変わることがあるので、参照時は版を確認する。
- **ISO/IEC 9797-1** の MAC Algorithm 3 は有償だが、EMV Book 2 Annex A1.2 に同等の記述がある。
- **PCI PIN Security Requirements** (PCI SSC) — 鍵管理の運用要件(デュアルコントロール、鍵ブロック化など)。https://www.pcisecuritystandards.org/

## 有償の規格(概念の出典)

- **ISO 9564-1** — PIN ブロック形式(Format 0〜4)。
- **ANSI X9.24-1** — 対称鍵の鍵管理(鍵階層、DUKPT)。
- **ANSI X9 TR-31 / X9.143** — 鍵ブロック。
- **ISO 11568** — 金融向け鍵管理。

## 会員限定で本リポジトリには含めていないもの

- Visa Integrated Circuit Card Specification (VIS) — MDK / UDK の呼び名、CVN の定義元。
- VisaNet のメッセージ仕様 — ZCMK / IWK / AWK の呼び名の出典。
- Thales payShield のコマンドリファレンス — LMK / ZMK / ZPK / TPK などの呼び名の出典。

これらの内容は本リポジトリでは引用せず、公開標準の用語で説明したうえで「各組織ではこう呼ぶ」という対応だけを記している。

## 実装の検算に使ったもの

- CVV: CVK A `0123456789ABCDEF`, CVK B `FEDCBA9876543210`, PAN `4123456789012345`, 有効期限 `8701`, サービスコード `101` → CVV `561`(各種 OSS 実装で広く使われているテストベクタ)。
- その他の値は JS 版と Go 版の出力が一致することで相互に検算している(`make check`)。
