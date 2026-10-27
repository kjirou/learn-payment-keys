# 略語集

| 略語 | 正式名 | 一言 |
|---|---|---|
| AC | Application Cryptogram | EMV のクリプトグラム総称(ARQC / TC / AAC) |
| AIP | Application Interchange Profile | カードが対応する機能のビット列 |
| ARC | Authorisation Response Code | 承認結果コード。"00" = 承認 |
| ARPC | Authorisation Response Cryptogram | イシュア→カードの応答クリプトグラム |
| ARQC | Authorisation Request Cryptogram | カード→イシュアの要求クリプトグラム |
| ATC | Application Transaction Counter | カードの取引カウンタ |
| AWK | Acquirer Working Key | VisaNet とアクワイアラ間の PIN 暗号化鍵 |
| CSK | Common Session Key | EMV Book 2 Annex A1.3 のセッション鍵派生方式 |
| CSU | Card Status Update | ARPC 方式 2 でカードに送る指示 |
| CVK | Card Verification Key | CVV 計算鍵 |
| CVN | Cryptogram Version Number | Visa のクリプトグラム方式番号 |
| CVV | Card Verification Value | 磁気ストライプ等の検証値 |
| DUKPT | Derived Unique Key Per Transaction | 取引ごとに鍵を変える端末向け方式 |
| HSM | Hardware Security Module | 鍵を保管し暗号処理を行う専用装置 |
| IAD | Issuer Application Data | カードがイシュアに送る独自データ。CVN、CVR を含む |
| ICC | Integrated Circuit Card | IC カード |
| IMK | Issuer Master Key | EMV のイシュアマスター鍵。Visa では MDK |
| IWK | Issuer Working Key | VisaNet とイシュア間の PIN 暗号化鍵 |
| KCV | Key Check Value | 鍵の照合値 |
| KEK | Key Encryption Key | 鍵を暗号化するための鍵。ZMK の一般名 |
| LMK | Local Master Key | HSM 内の最上位鍵 |
| MDK | Master Derivation Key | Visa での IMK の呼び名 |
| PAN | Primary Account Number | カード番号 |
| PEK | PIN Encryption Key | PIN 暗号化鍵の一般名 |
| PSN | PAN Sequence Number | 同じ PAN の複数カードを区別する番号 |
| PVK | PIN Verification Key | PIN 検証鍵 |
| PVKI | PIN Verification Key Index | どの PVK を使ったかを示す番号 |
| PVV | PIN Verification Value | Visa 方式の PIN 検証値 |
| SK | Session Key | セッション鍵 |
| SMC | Secure Messaging for Confidentiality | 発行者スクリプトの暗号化用 |
| SMI | Secure Messaging for Integrity | 発行者スクリプトの MAC 用 |
| TMK | Terminal Master Key | 端末のマスター鍵 |
| TPK | Terminal PIN Key | 端末の PIN 暗号化鍵 |
| TR-31 | ANSI X9 TR-31 | 鍵ブロックの標準(後に X9.143) |
| TSP | Transformed Security Parameter | PVV 計算の入力 |
| TVR | Terminal Verification Results | 端末の検証結果ビット列 |
| UDK | Unique Derivation Key | Visa でのカード鍵(ICC Master Key)の呼び名 |
| UN | Unpredictable Number | 端末が生成する乱数 |
| ZCMK | Zone Control Master Key | VisaNet での ZMK の呼び名 |
| ZMK | Zone Master Key | 組織間の鍵運搬用マスター鍵 |
| ZPK | Zone PIN Key | 組織間の PIN 暗号化鍵 |
