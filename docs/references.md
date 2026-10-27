# 参照した規格・資料

## 無償で読めるもの

- **EMV Book 2: Security and Key Management** (EMVCo) — IMK / ICC Master Key の派生(Annex A1.4)、セッション鍵(Annex A1.3)、ARQC / ARPC(8 章)、Retail MAC(Annex A1.2)。https://www.emvco.com/specifications/
- **EMV Book 3: Application Specification** — CDOL、IAD などデータ要素の定義。
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
