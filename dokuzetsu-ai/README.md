# ドクゼツAI(プロトタイプ)

ローカル動作の対話型AIメンタルサポートアプリ。会話内容は外部クラウドに一切送信せず、
Ollama(LLM)・faster-whisper(ASR)・VOICEVOX(TTS)・Gradio(UI)のみで完結します。

## ディレクトリ構成

```
dokuzetsu-ai/
├── requirements.txt   # 依存ライブラリ
├── config.yaml        # Ollama/VOICEVOX等のローカルエンドポイント設定
├── persona_prompts.py # 対話哲学(サイレント否定禁止・課題の分離・幸福の再定義・絶対的受容)
├── asr_engine.py       # faster-whisper 音声認識(VADで無音区間を除去)
├── tts_engine.py       # VOICEVOX 音声合成(無音区間トリミングで高速化)
├── llm_engine.py       # Ollama ストリーミング対話クライアント
├── session_manager.py  # 初回判定・トラウマ検知・3分タイマー
├── avatar_ui.py         # アバター選択 & 3分セッションUI(Gradio)
├── vision_watch.py      # 【任意/既定OFF】ローカル完結のプレゼンス検知の雛形
└── main.py              # 起動スクリプト
```

## 事前準備(すべてローカル)

1. **Ollama** をインストールし、モデルを取得
   ```bash
   ollama pull llama3.1:8b
   ollama serve   # 既に起動している場合は不要
   ```
2. **VOICEVOX ENGINE** をダウンロードして起動しておく
   (公式配布のデスクトップ版 or エンジン単体。既定で `http://localhost:50021` で待受)
3. Python 3.10+ を推奨。マイク入力を使う場合はOSのマイク権限を許可してください。

## セットアップ

```bash
cd dokuzetsu-ai
python -m venv .venv && source .venv/bin/activate   # 任意
pip install -r requirements.txt
```

## 起動

```bash
python main.py
```

起動後、ブラウザで `http://127.0.0.1:7860` を開きます。

1. アバター(声・トーン)を選択して「3分間はじめる」
2. マイクで話すか、テキストで入力して「送る」
3. 3分経過すると自動的にその日の気づきが要約され、次回への導線(デモ)が表示される

## 設定変更

`config.yaml` でモデル名・VOICEVOXの話者ID・セッション時間(既定180秒)・
アバターの追加/編集・無音トリミングの閾値などを調整できます。

## プライバシーについて

- `privacy.local_only: true`(既定)により、対話内容はどこにも外部送信されません。
- `privacy.save_transcripts: false`(既定)。ログを残す場合のみ `local_records/` 配下に保存する設計です。
- `vision_watch.py` は既定で無効な任意機能で、顔の有無だけを見るローカル処理です。画像の保存・外部送信は行いません。

## 注意(プロトタイプの制約)

- セッション終了画面の「続けるプラン」表示は導線のデモのみで、実際の決済処理は含まれていません。
- `persona_prompts.py` のセーフティネット(`contains_silent_negation`)は簡易な文字列検知であり、
  完全な保証ではありません。プロンプト設計との二重の備えとして併用してください。
