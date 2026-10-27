# 00. 全体像: 決済カードの鍵階層

## なぜ「階層」なのか

決済システムの鍵は単独では存在せず、「上位の鍵が下位の鍵を守る(暗号化する、または派生させる)」という親子関係で管理される。この木構造を **鍵階層(key hierarchy)** と呼ぶ。鍵は平文のままネットワークに出さず、必ず上位の鍵で暗号化された形で運ぶ、というのが基本原則。

本リポジトリで扱うのは、次の 2 本の木。

```
[A] 鍵交換・PIN 系(対称鍵、オンライン取引のメッセージ保護)

LMK  (HSM 内のローカルマスター鍵。HSM の外には決して出ない)
└── ZMK / ZCMK   (組織間で共有するゾーンマスター鍵。作業鍵を運ぶための鍵 = KEK)
    ├── ZPK / IWK / AWK  (PIN ブロック暗号化用の作業鍵)
    ├── PVK              (PIN 検証用の鍵)
    └── CVK              (CVV 計算用の鍵)
    (端末側では TMK → TPK という同形の小さな木がある)

[B] EMV 系(IC チップとイシュア間のクリプトグラム)

IMK / MDK  (イシュアマスター鍵。AC / SMI / SMC の 3 本)
└── UDK / ICC Master Key  (PAN + PSN からカードごとに派生)
    └── セッション鍵       (ATC から取引ごとに派生)
        └── ARQC / ARPC / 発行者スクリプトの MAC・暗号化
```

[A] は「鍵を暗号化して運ぶ」木、[B] は「鍵を計算で派生させる」木という違いがある。

## 一般名と各組織の呼び名

Visa や HSM ベンダー固有に見える用語の多くは、公開標準の概念に対する呼び名である。

| 概念 | 準拠規格 | 一般名 | Thales payShield | Visa |
|---|---|---|---|---|
| HSM 内マスター鍵 | - | - | LMK | - |
| 鍵を運ぶための鍵 | ANSI X9.24, ISO 11568 | KEK (Key Encryption Key) | ZMK | ZCMK |
| PIN 暗号化鍵(組織間) | ISO 9564, ANSI X9.8 | PEK (PIN Encryption Key) | ZPK | IWK(イシュア側)/ AWK(アクワイアラ側) |
| PIN 暗号化鍵(端末) | 同上 | - | TPK | - |
| 端末のマスター鍵 | 同上 | - | TMK | - |
| PIN 検証鍵 | ベンダー方式(Visa PVV / IBM 3624) | - | PVK | PVK |
| カード検証値の鍵 | - | - | CVK | CVK A / CVK B |
| EMV イシュアマスター鍵 | EMV Book 2 | IMK | - | MDK (MDK_AC / MDK_SMI / MDK_SMC) |
| EMV カード鍵 | EMV Book 2 | ICC Master Key | - | UDK |
| EMV セッション鍵 | EMV Book 2 Annex A1.3 | Session Key | - | (CVN により有無・方式が異なる) |

Mastercard では IMK をそのまま IMK と呼び、M/Chip の派生方式を用いる。概念は同じで、名前と細部のオプションが違う、と理解しておけばよい。

## 本リポジトリで扱う範囲

| 章 | 扱う内容 | 実装 |
|---|---|---|
| 01 | ZMK、鍵コンポーネント、KCV、key-under-key | ○ |
| 02 | ISO 9564 Format 0 PIN ブロック、ZPK 暗号化、PIN 変換、PVV | ○ |
| 03 | UDK 派生(Option A)、Common Session Key、ARQC、ARPC 方式 1 | ○ |
| 04 | CVV / iCVV | ○ |

## 扱わない(が存在は知っておくべき)もの

- **LMK のバリアントと鍵ブロック(TR-31 / Thales Key Block)**: HSM が鍵を保管・交換する際の実フォーマット。本リポジトリでは「ZMK で単純に 3DES 暗号化」で代用している。
- **DUKPT**: POS 端末で取引ごとに鍵を変える方式(ANSI X9.24-1/3)。
- **AES 系鍵**: 近年は 3DES から AES への移行が進んでいる(TR-31 の AES 鍵ブロック、EMV の AES 版アルゴリズム)。
- **RSA 系の鍵(CA 公開鍵、発行者鍵、ICC 鍵)**: EMV のオフラインデータ認証(SDA/DDA/CDA)で使う非対称鍵。本リポジトリの対称鍵階層とは別の木。
- **トークン化(Visa Token Service 等)の鍵**。
