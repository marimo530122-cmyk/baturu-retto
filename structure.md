# バツルーレット プロジェクト構成図

最終更新: 2026年8月11日（`i18n.js`/`odai-data.js`分離のタイミング）

このファイルは、プロジェクト全体を素早く把握するための地図です。細かい仕様は `要件定義書.md` を参照してください。

---

## 1. 全体像

ビルドツール（webpack等）を使わない、素の HTML / CSS / JavaScript の静的サイトです。`index.html` が `<script src="...">` タグを**決まった順番**で読み込むことで動いています。順番を間違えると壊れるので、新しいファイルを足すときは必ずこの順番のルールに従ってください。

- 本番公開先: [GitHub Pages](https://marimo530122-cmyk.github.io/baturu-retto/)（このリポジトリの`main`ブランチから自動公開）
- リポジトリ: `github.com/marimo530122-cmyk/baturu-retto`

## 2. スクリプトの読み込み順（`index.html`内、実際の並び順）

```
firebase-app-compat.js / firebase-database-compat.js   … Google製、外部CDN
firebase-config.js       … あなたのFirebase設定（プレースホルダー可）
online.js                … 📡オンラインモード
moderation.js            … 投稿の自動審査ロジック
submissions.js           … 📮お題投稿・共有
referral.js              … 🔗お友達紹介・24時間お試し特典
billing-config.js        … あなたのStripe決済リンク設定
billing.js                … 💎課金判定ロジック
ads-config.js            … あなたのGoogle AdSense設定
ads.js                    … 📢広告表示ロジック
ai-roast-config.js       … あなたのVercelデプロイ先設定
ai-roast.js               … 😈タゴサクAIチャットのロジック
bgm.js / sfx.js / confetti.js / achievements.js / highlights.js
odai-data.js              … 📦お題データ本体（9パック分、ロジックなし）★
odai-generator.js         … お題の抽選ロジック（odai-data.jsに依存）
swarm.js                  … ✨背景の光の粒演出
hype-meter.js             … 🔊盛り上がりメーター（マイク音量）
i18n.js                    … 🌐UI文言集（12言語ぶん、ロジックなし）★
game.js                    … ゲーム本体のロジック・画面制御（i18n.js/odai-data.jsに依存）
```

★ = 2026-08-11に`game.js`/`odai-generator.js`から分離した、純粋なデータだけのファイル（詳細は下記4章）。

**鉄則**: データファイル（`odai-data.js`, `i18n.js`）は、それを使うロジックファイル（`odai-generator.js`, `game.js`）より**必ず前**に書くこと。逆にすると「未定義の変数」エラーで画面が真っ白になります。

## 3. キャッシュ避けバージョン番号のルール（最重要）

`index.html`の全`<script>`/`<link>`タグには`?v=49`のような番号が付いています。**ファイルの中身を1文字でも変えたら、このプロジェクト内の全ての`?v=`を1つ上げてから公開してください**（現在の最新番号は`index.html`内で確認）。これを忘れると、LINE等のアプリ内ブラウザやスマホのキャッシュが古い内容を握ったままになり、直したはずの不具合が「直っていない」ように見えます（過去に複数回この問題で時間を溶かした経緯あり）。

## 4. なぜファイルを分けたか（2026-08-11の変更）

`game.js`と`odai-generator.js`が、それぞれ4,000〜4,500行程度まで大きくなっていました。中身を調べたところ、実際のロジックは少なく、大半が「9言語ぶんの翻訳文字列」「9パックぶんのお題データ」という**データ**でした。そこで、ロジックを一切変えずに、データ部分だけを別ファイルへ移動しました。

| 分離前 | 分離後 |
|---|---|
| `game.js` 4,316行 | `game.js` 2,433行 + `i18n.js` 1,895行 |
| `odai-generator.js` 4,566行 | `odai-generator.js` 339行 + `odai-data.js` 4,244行 |

- `i18n.js` / `odai-data.js` は**中身が完全にデータだけ**（`const 変数名 = {...}`の塊）で、他のファイルへの依存が一切ありません。安心して開いて編集できます。
- ロジック（`game.js`の画面制御、`odai-generator.js`のお題抽選アルゴリズム）は今回一切変更していません。

## 5. お題データの構造（`odai-data.js`）

| 定数名 | 内容 | 対応言語（2026-08-17時点） |
|---|---|---|
| `ODAI_DATA` | 標準パック（50×50=2500通り） | 10言語（ja/en/zh/ko/es/pt/vi/fr/th/id）。de・tlのみ未対応 |
| `ADULT_DATA` | 🔞大人向け | 12言語（全言語対応済み） |
| `FAMILY_DATA` | 👨‍👩‍👧ファミリー | 12言語（全言語対応済み） |
| `COUPLE_DATA` | 💑1対1モード | 12言語（全言語対応済み） |
| `ROMANCE_DATA` | 💌恋愛パック | 12言語（全言語対応済み） |
| `PARTY_DATA` | 🎉法人・パーティー | 12言語（全言語対応済み） |
| `SOLO_DATA` | 🍶ひとり飲み | 12言語（全言語対応済み） |
| `NOALCOHOL_DATA` | 🥤ノンアル版 | 12言語（全言語対応済み） |
| `NERUTON_DATA` | 💘ねるとんZoom | 日英のみ（2言語、他8言語すべて未対応。他の有料パックより遅れている） |

未対応言語を選ぶと自動的に標準パック（`ODAI_DATA`）の同じ言語へフォールバックする仕組みです（`odai-generator.js`の`generateOdai()`内）。標準パック自体が未対応の言語（de/tl）は、最終的に日本語のお題が出ます。

## 6. 有料機能ごとの設定ファイル対応表

課金・外部サービス連携が必要な機能は、それぞれ専用の「あなたが設定する場所」ファイルを持っています。プレースホルダーのままなら、その機能は自動的に無効（他機能への影響なし）です。

| 機能 | 設定ファイル | 設定方法 |
|---|---|---|
| 💎 プレミアム課金（Stripe） | `billing-config.js` | 要件定義書.md セクション11 |
| 📡 オンラインモード / 📮 投稿共有 | `firebase-config.js` | 要件定義書.md セクション10 |
| 📢 広告（AdSense） | `ads-config.js` | 要件定義書.md セクション12 |
| 🍶 飲み友AIチャット（9キャラ） | `ai-roast-config.js` + Vercel側の`api/roast.js` | 要件定義書.md セクション13 |

## 7. その他のディレクトリ

- `api/` … Vercel用サーバーレス関数（タゴサクAIのAI中継のみ。本体サイトはGitHub Pagesのまま）
- `daily/` … 毎朝GitHub Actionsが自動生成する動画（`latest.mp4`を毎日上書き）
- `公開用/` … 旧・手動アップロード用フォルダ（現在はGitHub Pagesが自動公開するため役目は薄い）
- `scripts/` … LINE自動配信等の補助スクリプト

## 8. 既知の未解消事項（2026-08-17時点）

- 🔗紹介モーダルの文言は日本語にしか用意されていない（他言語では自動的に日本語表示にフォールバック、壊れてはいない）
- タゴサクAIは、Google AI StudioのAPIキー取得で複数のGoogleアカウント（別アカウントで再試行済み）とも「`AQ.`形式の制限付きトークンしか発行できない」問題にあたったため、2026-08-17に**Groq API（無料枠・クレジットカード登録不要）へ切り替え済み**（`api/roast.js`のMODELを`llama-3.3-70b-versatile`に変更、環境変数名も`GEMINI_API_KEY`→`GROQ_API_KEY`に変更）。ユーザーによるGroqでのAPIキー発行・Vercelへのデプロイ・環境変数設定はまだ未完了、次回セッションで続きを確認すること
- 2026-08-17、😈タゴサクAIをタイトル画面の独立パックボタン（`pack-roast`）から廃止し、🍶ひとり飲みモード専用の機能として統合した（`state.pack === "solo"`かつ`state.lang === "ja"`のときだけ、ゲーム画面の`#btn-roast-solo`ボタンとして表示、クリックで従来通り`modal-roast`のチャットを開く。表示切り替えは`startRound()`内）。プレミアム判定・チャットのロジック自体（`ai-roast.js`/`api/roast.js`）は変更なし
- 🎉法人・パーティープラン専用の決済リンク（`STRIPE_PARTY_PAYMENT_LINK`、`billing-config.js`）がプレースホルダーのままで、実際には購入できない（通常のプレミアム課金は本番稼働中、これは別枠の単品販売分）
- Stripe決済の不正対策は`session_id`の形式チェックのみ（Webhook検証は将来課題）
- 2026-08-17、フランス語・タイ語・インドネシア語の標準パックお題（`ODAI_DATA`）と🥤ノンアル版パック（`NOALCOHOL_DATA`）の残り言語ぶんを追加し、あわせて`odai-generator.js`の表示テンプレート（`generateOdai()`）と読み上げ用の言語マップ（`PREFIX_MAP`/`BCP47_MAP`）にもfr/th/idの分岐を追加した。これが抜けていると、お題データ自体はその言語でもテンプレート側が最後の`else`（日本語専用の「〜から〜へ」文型）に落ちてしまい、日本語の文型に他言語のお題が混ざって表示されるバグになるため、**新しい言語のお題データを追加するときは、必ず`odai-data.js`だけでなく`odai-generator.js`の`generateOdai()`内の言語分岐（displayText/speechText）とスピーチ用の`PREFIX_MAP`/`BCP47_MAP`も同時に追加すること**（片方だけ追加してもう片方を忘れる、という抜けが起きやすい）。
- **⚠️ ドイツ語・タガログ語は、UI（ボタンや案内文）のみ対応済みで、標準パックのお題の中身はまだ未翻訳**。この2言語を選ぶと、画面の文字はその言語で表示されるが、実際のお題は日本語のまま出る（`ODAI_DATA[lang] || ODAI_DATA.ja`のフォールバックのため。表示テンプレート自体はde/tl用に用意済みなので、お題データさえ追加すれば動く）
- 2026-08-17、有料6パック（ADULT/FAMILY/COUPLE/ROMANCE/PARTY/SOLO）と🥤ノンアル版パックに、フランス語・タイ語・インドネシア語のお題を追加。これで`NERUTON_DATA`（💘ねるとんZoom）以外のすべてのパックが12言語フル対応になった
- **⚠️ 💘ねるとんZoomパック（`NERUTON_DATA`）が日本語・英語の2言語のみ**。他の有料パックはすべて12言語まで拡張されたのに、これだけ取り残されている（残る唯一の多言語ギャップ）
- 2026-08-22、🍶ひとり飲みモード＋飲み友AI専用の月額サブスク（¥500/月「ワンコイン」）を追加。`billing.js`に`SoloBilling`（`createBillingModule()`を再利用）、`billing-config.js`に`STRIPE_SOLO_PAYMENT_LINK`（プレースホルダー、Stripeで「Recurring/Monthly」の決済リンクを作成して設定する）を追加。`game.js`に`isSoloPremiumUnlocked()`/`blockIfNotSoloPremium()`を追加し、`pack-solo`ボタンと`btn-roast-solo`（飲み友AI）だけがこちらを見るようにした（他のパックは従来通り`Billing`/`blockIfNotPremium`のまま）。`setupSimplePackToggle()`に5番目の引数`blockFn`を追加して差し替え可能にした。`showPremiumModal(text, billingModule)`も第2引数でどちらの決済リンクを開くか切り替えられるようにした。QRコードの24時間お試し（`Referral`）は、当初SoloBillingだけに絞る案もあったが、既存の12言語ぶんの販促文言（「大人向けパックも解放」等）と矛盾するため、**通常プレミアムと同じく全プレミアムに一律適用**する方針で確定（`SoloBilling`も`allowReferralBonus: true`）。
- 2026-08-22、😈タゴサクAIを🍶「飲み友AI」に名称変更し、9キャラクター制にした。新規データファイル`ai-roast-characters.js`（id/name/emoji/tagline/opener、ロジックへの依存なしの純データ）を追加し、`ai-roast-config.js`の直後・`ai-roast.js`の直前に読み込む（データがロジックより前、の原則通り）。`AiRoast.open()`を呼ぶたびにランダムで1人選び、選んだキャラのopener文をAPI呼び出しなしでそのまま表示、以降の会話は`character`idをサーバーに送ってペルソナを切り替える。サーバー側`api/roast.js`は`CHARACTER_PERSONAS`に9人分のペルソナ（タゴサク含む）を持ち、`SHARED_RULES`（安全ルール等）を全ペルソナ共通で末尾付与する構成。⑥〜⑨（怪盗ダンディ/渋さん/魔性のルナ/剣士・凪）は実在作品のキャラクターを模倣しない完全オリジナル設定（著作権配慮）。
