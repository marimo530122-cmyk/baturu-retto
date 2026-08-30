"""セッション状態管理

- 初回利用判定(絶対的受容からの開始トリガー)
- トラウマ・危機的サインの簡易検知
- 3分セッションのタイマー
すべてローカルのファイルのみで完結し、外部送信は行わない。
"""
import json
import time
from pathlib import Path

STATE_FILE = Path("./local_records/state.json")

TRAUMA_KEYWORDS = [
    "死にたい", "消えたい", "つらい", "しんどい", "限界",
    "傷つい", "自分を責め", "パワハラ", "虐待", "裏切られ",
]


def is_first_session() -> bool:
    return not STATE_FILE.exists()


def mark_session_done() -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    session_count = 1
    if STATE_FILE.exists():
        try:
            prev = json.loads(STATE_FILE.read_text(encoding="utf-8"))
            session_count = prev.get("session_count", 0) + 1
        except (json.JSONDecodeError, OSError):
            pass
    data = {"last_session_at": time.time(), "session_count": session_count}
    STATE_FILE.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")


def detect_trauma_signal(text: str) -> bool:
    return any(keyword in text for keyword in TRAUMA_KEYWORDS)


class SessionTimer:
    """1回3分の対話セッションを計測するだけの、シンプルなタイマー。"""

    def __init__(self, duration_seconds: int, warn_before_end_seconds: int = 20):
        self.duration = duration_seconds
        self.warn_before = warn_before_end_seconds
        self.start_time: float | None = None

    def start(self) -> None:
        self.start_time = time.time()

    def remaining(self) -> float:
        if self.start_time is None:
            return float(self.duration)
        return max(0.0, self.duration - (time.time() - self.start_time))

    def is_finished(self) -> bool:
        return self.remaining() <= 0

    def is_near_end(self) -> bool:
        r = self.remaining()
        return 0 < r <= self.warn_before
