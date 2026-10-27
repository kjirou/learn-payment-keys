# 03. EMV 系: IMK(MDK), UDK, セッション鍵, ARQC / ARPC

## 登場する鍵

| 鍵 | EMV の名前 | Visa の名前 | 役割 |
|---|---|---|---|
| イシュアマスター鍵 | IMK (Issuer Master Key) | MDK (Master Derivation Key) | イシュアが保持。カード鍵を派生させる元。 |
| カード鍵 | ICC Master Key (MK) | UDK (Unique Derivation Key) | カードごとに一意。IC チップ内と、イシュア側の計算で存在。 |
| セッション鍵 | Session Key (SK) | - | 取引ごとに派生。クリプトグラムの計算に使う。 |

IMK / UDK はそれぞれ用途別に 3 本ある。

| 接尾辞 | 用途 |
|---|---|
| AC | Application Cryptogram(ARQC / ARPC / TC / AAC)の生成と検証 |
| SMI | Secure Messaging for Integrity。発行者スクリプトの MAC |
| SMC | Secure Messaging for Confidentiality。発行者スクリプト内の機密データ(新 PIN 等)の暗号化 |

Visa 表記だと MDK_AC、MDK_SMI、MDK_SMC。本リポジトリの実装は AC 系のみ。

## 鍵の派生(鍵階層 [B])

```
IMK_AC ──(PAN, PSN)──▶ UDK_AC ──(ATC)──▶ SK_AC ──▶ ARQC / ARPC
```

[A] の木が「暗号化して運ぶ」のに対し、[B] の木は「計算で派生する」。イシュアは IMK だけ保管しておけば、どのカードの鍵も、どの取引のセッション鍵も必要なときに再計算できる。

### UDK 派生: EMV Book 2 Annex A1.4.1 Option A

```
Y   = (PAN || PSN) の右 16 桁            (PSN = PAN Sequence Number, 2 桁)
ZL  = 3DES_IMK( Y )
ZR  = 3DES_IMK( Y XOR FFFFFFFFFFFFFFFF )
UDK = 奇数パリティ調整( ZL || ZR )
```

Option B は PAN が 16 桁を超える場合向けで、SHA-1 とデシマライズを使う。

### セッション鍵派生: EMV Book 2 Annex A1.3 (Common Session Key)

```
R    = ATC(2 バイト) || 00 || 00 || 00 00 00 00
SK_L = 3DES_UDK( ATC || F0 || 00 || 00 00 00 00 )
SK_R = 3DES_UDK( ATC || 0F || 00 || 00 00 00 00 )
SK   = 奇数パリティ調整( SK_L || SK_R )
```

ATC (Application Transaction Counter) はカードが取引ごとに増やすカウンタ。同じ UDK でも取引ごとに別のセッション鍵になる。

### CVN (Cryptogram Version Number)

Visa では **CVN** がクリプトグラムの計算方式を指定する。代表的なもの:

| CVN | セッション鍵 | 特徴 |
|---|---|---|
| 10 | 使わない(UDK で直接 MAC) | 古い方式。 |
| 18 | Common Session Key | 上記の派生を使う。ARQC 入力に IAD 全体を含む。 |
| 22 | Common Session Key | 新しいフォーマットの IAD を使う。 |

Mastercard の M/Chip も Common Session Key を使うが、ARQC の入力データや ARPC 方式の選択が異なる。CVN は IAD (Issuer Application Data, tag 9F10) に埋め込まれてイシュアに届き、イシュアはそれを見て検証方式を決める。実装のサンプルでは IAD を `06 01 12 03 A0 B8 00` とし、3 バイト目の `0x12` = 18 が CVN 18 を表す。

## ARQC (Authorisation Request Cryptogram)

カードがオンライン承認を要求するときに生成する MAC。イシュアは同じ鍵と同じデータで再計算し、一致すればカードが本物であり取引データが改ざんされていないと判断する。

```
ARQC = RetailMAC_SK( 取引データ )
```

**Retail MAC** は ISO/IEC 9797-1 MAC Algorithm 3(パディング方式 2 = `80 00 ...`)で、全ブロックを左半分の鍵で単一 DES CBC にかけ、最後のブロックだけ右半分の鍵で復号してから左半分の鍵で再暗号化する。

取引データの並び(CVN 18 の場合):

| タグ | 名前 | 長さ |
|---|---|---|
| 9F02 | Amount, Authorised | 6 |
| 9F03 | Amount, Other | 6 |
| 9F1A | Terminal Country Code | 2 |
| 95 | TVR (Terminal Verification Results) | 5 |
| 5F2A | Transaction Currency Code | 2 |
| 9A | Transaction Date | 3 |
| 9C | Transaction Type | 1 |
| 9F37 | Unpredictable Number | 4 |
| 82 | AIP (Application Interchange Profile) | 2 |
| 9F36 | ATC | 2 |
| 9F10 | IAD (Issuer Application Data) | 可変 |

9F02 から 9F37 までは端末が CDOL1 で要求する「最小推奨データ」で、EMV Book 2 8.1.1 に定義されている。AIP 以降はカード内部のデータ。

## ARPC (Authorisation Response Cryptogram)

イシュアが「この ARQC を確認したうえで承認 / 否認した」ことをカードに証明する値。カードは ARPC を検証し、正しければ発行者スクリプトの実行やオフラインカウンタのリセットなどを行う。

### 方式 1

```
ARPC = 3DES_SK( ARQC XOR ( ARC || 00 00 00 00 00 00 ) )      (8 バイト)
```

ARC (Authorisation Response Code) は 2 バイトの ASCII で、`30 30` = "00" が承認。

### 方式 2

```
ARPC = RetailMAC_SK( ARQC || CSU || Proprietary Authentication Data ) の先頭 4 バイト
```

CSU (Card Status Update) でカードへの指示(カウンタリセット等)を同時に送れる。CVN 18 では方式 1、より新しい方式では方式 2 が使われる。本リポジトリでは方式 1 のみ実装。

## 発行者スクリプト(SMI / SMC)

承認応答の中で、イシュアがカードにコマンド(PIN 変更、アプリケーションブロック等)を送る仕組み。コマンドには SK_SMI で計算した MAC を付け、機密データは SK_SMC で暗号化する。鍵派生の仕組みは AC と同じで、使う IMK が違うだけ。

## 実装

- `js/src/emv.js`、`go/emv.go`: UDK 派生(Option A)、Common Session Key、Retail MAC、ARQC、ARPC 方式 1
