# 04. EMV 系: IMK(MDK), ICC Master Key(UDK), セッション鍵, ARQC / ARPC

## 登場する鍵

| 鍵 | EMV の名前 | Visa の名前 | 役割 |
|---|---|---|---|
| イシュアマスター鍵 | IMK (Issuer Master Key) | MDK (Master Derivation Key) | イシュアが保持。カード鍵を派生させる元。 |
| カード鍵 | ICC Master Key (MK)。ICC = Integrated Circuit Card | UDK (Unique Derivation Key) | カードごとに一意。IC チップ内と、イシュア側の計算で存在。 |
| セッション鍵 | Session Key (SK) | - | 取引ごとに派生。クリプトグラムの計算に使う。 |

IMK / ICC Master Key はそれぞれ用途別に 3 本ある。

| 接尾辞 | 用途 |
|---|---|
| AC | Application Cryptogram(ARQC / ARPC / TC / AAC)の生成と検証 |
| SMI | Secure Messaging for Integrity。発行者スクリプトの MAC |
| SMC | Secure Messaging for Confidentiality。発行者スクリプト内の機密データ(新 PIN 等)の暗号化 |

Visa 表記だと MDK_AC、MDK_SMI、MDK_SMC(ICC Master Key 側は UDK_AC、UDK_SMI、UDK_SMC)。本ドキュメントでは EMV の一般名を使い、ICC Master Key は MK と略す。本リポジトリの実装は AC 系のみ。

## 鍵の派生(鍵階層 [B])

```
IMK_AC ──(PAN, PSN)──▶ MK_AC ──(ATC)──▶ SK_AC ──▶ ARQC / ARPC
(Visa: MDK_AC)          (Visa: UDK_AC)
```

[A] の木が「暗号化して運ぶ」のに対し、[B] の木は「計算で派生する」。イシュアは IMK だけ保管しておけば、どのカードの鍵も、どの取引のセッション鍵も必要なときに再計算できる。

### ICC Master Key (MK) の派生: EMV Book 2 Annex A1.4.1 Option A

```
Y   = (PAN || PSN) の右 16 桁            (PSN = PAN Sequence Number, 2 桁)
ZL  = 3DES_IMK( Y )
ZR  = 3DES_IMK( Y XOR FFFFFFFFFFFFFFFF )
MK  = 奇数パリティ調整( ZL || ZR )
```

この手順は「イシュアが 1 本だけ持つ IMK から、カードごとに違う 16 バイト鍵を計算で作る」もの。各行の意味は次のとおり。

**1 行目: Y はカードの識別子(8 バイト)**

- `||` は連結。PAN(16 桁)の後ろに PSN(2 桁)をつなげて 18 桁の数字列にする。
- PSN は同じ PAN で複数枚のカード(再発行、家族カードなど)を区別する番号。PSN が違えば別の鍵が派生されるので、再発行後の新旧カードは鍵が異なる。
- 右 16 桁を取るのは、16 桁 = 8 バイトで DES の 1 ブロックにちょうど収まるため。PIN ブロック(`docs/03-pin-keys.md`)と違い、PAN のチェックデジットは除かない。PAN が短くて 16 桁に満たない場合は左を 0 で埋める。

```
PAN || PSN  : 4111111111111111 || 00 = 411111111111111100   (18 桁)
右 16 桁    :   1111111111111100                            (先頭の 41 を捨てる)
Y           : 11 11 11 11 11 11 11 00                       (8 バイト)
```

16 桁の PAN では先頭 2 桁(BIN の一部)が落ちるが、同一イシュア内で BIN は共通なのでカードの区別には影響しない。

**2〜3 行目: 8 バイトの入力から 16 バイトを得る**

Y を IMK で 3DES すると 8 バイトしか得られないが、必要なのは 16 バイトの鍵。そこで Y と、Y の全ビットを反転したもの(`Y XOR FF..FF`)を別々に暗号化し、8 バイトずつ 2 つの結果を得る。反転を使うのは「Y と必ず異なり、かつ Y から機械的に決まる 2 つ目の入力」が欲しいから。ECB で 1 ブロックずつ独立に計算する。

```
ZL = 3DES_IMK( 11 11 11 11 11 11 11 00 ) = B75FB1795A58CAD3
ZR = 3DES_IMK( EE EE EE EE EE EE EE FF ) = 5884BCE8ACE9627A   ← 入力は Y の各バイトを反転したもの
```

**4 行目: 連結して鍵の形に整える**

ZL と ZR を連結した 16 バイトが ICC Master Key(2-key 3DES 鍵)になる。ただし 3DES の出力はランダムなビット列で、各バイトのパリティはそろっていない。DES 鍵は各バイトの 1 の数が奇数になるよう最下位ビットを調整する慣習があり(`docs/01-crypto-basics.md` の「鍵のパリティ」)、HSM はこれを満たさない鍵を拒否することがある。そこで最後に 16 バイトそれぞれの最下位ビットだけを立てたり落としたりして奇数パリティにそろえる。

```
ZL || ZR(調整前) : B7 5F B1 79 5A 58 CA D3  58 84 BC E8 AC E9 62 7A
MK (調整後)        : B6 5E B0 79 5B 58 CB D3  58 85 BC E9 AD E9 62 7A
                     ↑  ↑  ↑     ↑     ↑         ↑     ↑  ↑          最下位ビットだけが変わる
```

DES は最下位ビットを読まないので、この調整で暗号結果は変わらない。カードに書き込む鍵とイシュア側で計算する鍵を同じ形式にそろえ、HSM に受け入れられる形にするための整形である。

**この手順の意味**

- イシュアは IMK を 1 本だけ安全に保管すればよく、カードごとの鍵をデータベースに持つ必要がない。取引が来たら PAN と PSN から MK を再計算できる。
- カード側には製造時(パーソナライゼーション)に MK を書き込む。IMK はカードに入らない。
- 3DES は IMK を知らなければ逆算できないので、あるカードの MK が漏れても IMK や他のカードの MK は分からない。

**Option B**

PAN が長く、チェックデジット込みで Y に収まらない場合などのために、PAN || PSN を SHA-1 でハッシュして 10 進にデシマライズし、16 桁を作る Option B が定義されている。本リポジトリは Option A のみ実装している。

### セッション鍵派生: EMV Book 2 Annex A1.3 (Common Session Key)

```
R    = ATC(2 バイト) || 00 || 00 || 00 00 00 00
SK_L = 3DES_MK( ATC || F0 || 00 || 00 00 00 00 )
SK_R = 3DES_MK( ATC || 0F || 00 || 00 00 00 00 )
SK   = 奇数パリティ調整( SK_L || SK_R )
```

ATC (Application Transaction Counter) はカードが取引ごとに増やすカウンタ。同じ MK でも取引ごとに別のセッション鍵になる。

### CVN (Cryptogram Version Number)

Visa では **CVN** がクリプトグラムの計算方式を指定する。代表的なもの:

| CVN | セッション鍵 | 特徴 |
|---|---|---|
| 10 | 使わない(MK で直接 MAC) | 古い方式。 |
| 18 | Common Session Key | 上記の派生を使う。ARQC 入力に IAD 全体を含む。 |
| 22 | Common Session Key | 新しいフォーマットの IAD を使う。 |

Mastercard の M/Chip も Common Session Key を使うが、ARQC の入力データや ARPC 方式の選択が異なる。CVN は IAD (Issuer Application Data, tag 9F10) に埋め込まれてイシュアに届き、イシュアはそれを見て検証方式を決める。実装のサンプルでは IAD を `06 01 12 03 A0 B8 00` とし、3 バイト目の `0x12` = 18 が CVN 18 を表す。

## ARQC (Authorisation Request Cryptogram)

カードがオンライン承認を要求するときに生成する MAC (Message Authentication Code、`docs/01-crypto-basics.md` 参照)。イシュアは同じ鍵と同じデータで再計算し、一致すればカードが本物であり取引データが改ざんされていないと判断する。

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

承認応答の中で、イシュアがカードにコマンド(PIN 変更、アプリケーションブロック等)を送る仕組み。カードは「本当にイシュアが送ったコマンドか」「途中で書き換えられていないか」を確かめてから実行する必要があり、そのために 2 種類のセッション鍵を使う。鍵派生の仕組みは AC と同じで、使う IMK が違うだけ。

| 鍵 | 守るもの | 使う仕組み |
|---|---|---|
| SK_SMI | コマンドが改ざん・偽造されていないこと(Integrity) | MAC |
| SK_SMC | コマンド内の秘密データ(新しい PIN など)が読まれないこと(Confidentiality) | 暗号化 |

各コマンドの末尾には SK_SMI で計算した MAC を付ける。計算アルゴリズムは ARQC と同じ Retail MAC で、鍵が AC 系ではなく SMI 系である点だけが違う。カードは同じ鍵で MAC を再計算し、一致したときだけコマンドを実行する。

```
コマンド本体 || MAC      MAC = RetailMAC_SK_SMI( ATC や ARQC を含むヘッダー || コマンド本体 )
```

PIN 変更コマンドのように秘密データを含む場合は、まず SK_SMC でそのデータを暗号化し、そのうえでコマンド全体に SK_SMI で MAC を付ける二段構えになる。

## 実装

- `js/src/emv.js`、`go/emv.go`: ICC Master Key 派生(Option A)、Common Session Key、Retail MAC、ARQC、ARPC 方式 1
