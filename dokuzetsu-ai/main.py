"""ドクゼツAI ー ローカル完結型 対話メンタルサポートアプリ 起動スクリプト

前提(すべてローカル):
  - Ollama が起動しており、対象モデル(既定: llama3.1:8b)が pull 済みであること
  - VOICEVOX ENGINE が起動していること(既定: http://localhost:50021)
使い方:
  pip install -r requirements.txt
  python main.py
"""
import yaml

from asr_engine import FasterWhisperASR
from avatar_ui import build_ui
from llm_engine import OllamaChat
from tts_engine import VoicevoxTTS


def load_config(path: str = "config.yaml") -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def main():
    config = load_config()

    llm_chat = OllamaChat(
        base_url=config["llm"]["base_url"],
        model=config["llm"]["model"],
        temperature=config["llm"].get("temperature", 0.7),
    )

    tts_engine = VoicevoxTTS(
        base_url=config["tts"]["base_url"],
        silence_cfg=config["tts"].get("silence_trim"),
    )

    asr_cfg = config["asr"]
    asr_engine = FasterWhisperASR(
        model_size=asr_cfg.get("model_size", "small"),
        device=asr_cfg.get("device", "cpu"),
        compute_type=asr_cfg.get("compute_type", "int8"),
        language=asr_cfg.get("language", "ja"),
        vad_filter=asr_cfg.get("vad_filter", True),
    )

    demo = build_ui(config, llm_chat, tts_engine, asr_engine)
    demo.queue().launch(server_name="127.0.0.1", server_port=7860, share=False)


if __name__ == "__main__":
    main()
