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

| 定数名 | 内容 | 対応言語 |
|---|---|---|
| `ODAI_DATA` | 標準パック（50×50=2500通り） | 9言語 |
| `ADULT_DATA` | 🔞大人向け | 日英のみ |
| `FAMILY_DATA` | 👨‍👩‍👧ファミリー | 日英のみ |
| `COUPLE_DATA` | 💑1対1モード | 日英のみ |
| `ROMANCE_DATA` | 💌恋愛パック | 日英のみ |
| `NERUTON_DATA` | 💘ねるとんZoom | 日英のみ |
| `PARTY_DATA` | 🎉法人・パーティー | 日英のみ |
| `NOALCOHOL_DATA` | 🥤ノンアル版 | 9言語 |
| `SOLO_DATA` | 🍶ひとり飲み | 日英のみ（一部言語で追加あり） |

「対応言語」が9言語未満のパックは、未対応言語を選ぶと自動的に標準パックへフォールバックする仕組みです（`odai-generator.js`の`generateOdai()`内）。

## 6. 有料機能ごとの設定ファイル対応表

課金・外部サービス連携が必要な機能は、それぞれ専用の「あなたが設定する場所」ファイルを持っています。プレースホルダーのままなら、その機能は自動的に無効（他機能への影響なし）です。

| 機能 | 設定ファイル | 設定方法 |
|---|---|---|
| 💎 プレミアム課金（Stripe） | `billing-config.js` | 要件定義書.md セクション11 |
| 📡 オンラインモード / 📮 投稿共有 | `firebase-config.js` | 要件定義書.md セクション10 |
| 📢 広告（AdSense） | `ads-config.js` | 要件定義書.md セクション12 |
| 😈 タゴサクAIチャット | `ai-roast-config.js` + Vercel側の`api/roast.js` | 要件定義書.md セクション13 |

## 7. その他のディレクトリ

- `api/` … Vercel用サーバーレス関数（タゴサクAIのAI中継のみ。本体サイトはGitHub Pagesのまま）
- `daily/` … 毎朝GitHub Actionsが自動生成する動画（`latest.mp4`を毎日上書き）
- `公開用/` … 旧・手動アップロード用フォルダ（現在はGitHub Pagesが自動公開するため役目は薄い）
- `scripts/` … LINE自動配信等の補助スクリプト

## 8. 既知の未解消事項（2026-08-11時点）

- 🔗紹介モーダルの文言は日本語にしか用意されていない（他言語では自動的に日本語表示にフォールバック、壊れてはいない）
- タゴサクAIは、Vercelへのデプロイ・APIキー設定がまだ完了していない
- Stripe決済の不正対策は`session_id`の形式チェックのみ（Webhook検証は将来課題）
- **⚠️ フランス語・タイ語・インドネシア語は、UI（ボタンや案内文）のみ対応済みで、お題の中身（`ODAI_DATA`標準パック2500通り）はまだ未翻訳**。この3言語を選ぶと、画面の文字はその言語で表示されるが、実際のお題は日本語のまま出る（`ODAI_DATA[lang] || ODAI_DATA.ja`のフォールバックのため）。各国の飲み会文化に合わせたお題の作り込みが必要なため、次のステップとして着手予定
