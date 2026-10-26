"""faster-whisper によるローカル音声認識(ASR)

VAD(Voice Activity Detection)で無音区間を除いてから認識することで、
実発話時間に対する処理時間を短縮する。音声データは一切外部送信しない。
"""
from faster_whisper import WhisperModel


class FasterWhisperASR:
    def __init__(
        self,
        model_size: str = "small",
        device: str = "cpu",
        compute_type: str = "int8",
        language: str = "ja",
        vad_filter: bool = True,
        min_silence_duration_ms: int = 300,
    ):
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
        self.language = language
        self.vad_filter = vad_filter
        self.min_silence_duration_ms = min_silence_duration_ms

    def transcribe(self, audio_path: str) -> str:
        if not audio_path:
            return ""
        segments, _info = self.model.transcribe(
            audio_path,
            language=self.language,
            vad_filter=self.vad_filter,
            vad_parameters={"min_silence_duration_ms": self.min_silence_duration_ms},
        )
        return "".join(seg.text for seg in segments).strip()
