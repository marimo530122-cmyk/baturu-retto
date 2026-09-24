"""VOICEVOX 音声合成エンジン（無音区間トリミングによる高速化つき）

VOICEVOX ENGINE（ローカルで起動する音声合成サーバー、既定 http://localhost:50021）
に対して audio_query -> synthesis の2段階でリクエストし、生成された wav の
無音区間（先頭・末尾・発話の間）を一定の長さまで切り詰めて再生開始を速くする。
外部への通信は一切行わない。
"""
import io

import numpy as np
import requests
import soundfile as sf


class VoicevoxTTS:
    def __init__(self, base_url: str, silence_cfg: dict | None = None):
        self.base_url = base_url.rstrip("/")
        cfg = silence_cfg or {}
        self.trim_enabled = cfg.get("enabled", True)
        self.threshold_db = cfg.get("threshold_db", -40)
        self.min_silence_ms = cfg.get("min_silence_ms", 150)

    def synthesize(self, text: str, speaker_id: int) -> bytes:
        """テキストを音声合成し、wavバイト列を返す。空文字なら空バイトを返す。"""
        text = (text or "").strip()
        if not text:
            return b""

        query_res = requests.post(
            f"{self.base_url}/audio_query",
            params={"text": text, "speaker": speaker_id},
            timeout=30,
        )
        query_res.raise_for_status()
        audio_query = query_res.json()

        synth_res = requests.post(
            f"{self.base_url}/synthesis",
            params={"speaker": speaker_id},
            json=audio_query,
            timeout=60,
        )
        synth_res.raise_for_status()
        wav_bytes = synth_res.content

        if self.trim_enabled:
            wav_bytes = self._trim_silence(wav_bytes)
        return wav_bytes

    def _trim_silence(self, wav_bytes: bytes) -> bytes:
        """無音区間(先頭・末尾・発話間すべて)を min_silence_ms まで切り詰める。"""
        data, sr = sf.read(io.BytesIO(wav_bytes), dtype="float32")
        if data.ndim > 1:
            data = data.mean(axis=1)
        if len(data) == 0:
            return wav_bytes

        frame_len = max(1, int(sr * 0.01))  # 10ms 単位でエネルギーを見る
        rms = np.sqrt(np.convolve(data ** 2, np.ones(frame_len) / frame_len, mode="same"))
        rms_db = 20 * np.log10(np.maximum(rms, 1e-10))
        voiced = rms_db > self.threshold_db

        if not voiced.any():
            return wav_bytes

        min_silence_samples = max(1, int(sr * self.min_silence_ms / 1000))

        out_chunks = []
        cur = 0
        n = len(data)
        while cur < n:
            if voiced[cur]:
                start = cur
                while cur < n and voiced[cur]:
                    cur += 1
                out_chunks.append(data[start:cur])
            else:
                start = cur
                while cur < n and not voiced[cur]:
                    cur += 1
                keep = min(cur - start, min_silence_samples)
                if keep > 0:
                    out_chunks.append(data[start:start + keep])

        trimmed = np.concatenate(out_chunks) if out_chunks else data

        out = io.BytesIO()
        sf.write(out, trimmed, sr, format="WAV")
        return out.getvalue()
