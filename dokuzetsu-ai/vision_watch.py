"""【拡張・任意機能】ローカル完結のプレゼンス検知スクリプト(雛形)

目的:
  ユーザーがカメラの前にいるかどうかだけをローカルで判定し、
  離席時にセッションタイマーを一時停止する補助に使うための雛形。

守っていること:
  - 顔認識(個人識別)は行わない。「顔らしきものが写っているか」だけを見る。
  - 映像・画像は保存しない。外部への送信も一切行わない。
  - 既定でOFF(config.yaml の vision.enabled: false)。有効化はユーザーの明示的な選択。

このファイル単体は補助スクリプトの雛形であり、main.py からは呼び出されない。
必要であれば avatar_ui.py 側から LocalPresenceWatcher.is_present() を
タイマーの一時停止判定に組み込む形で拡張できる。
"""
import cv2


class LocalPresenceWatcher:
    def __init__(self, camera_index: int = 0):
        self.camera_index = camera_index
        self._cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        self._cap = None

    def start(self) -> None:
        self._cap = cv2.VideoCapture(self.camera_index)

    def is_present(self) -> bool:
        if self._cap is None or not self._cap.isOpened():
            return True  # カメラが使えない場合は体験を妨げないよう常に「在席」扱い
        ok, frame = self._cap.read()
        if not ok:
            return True
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self._cascade.detectMultiScale(gray, 1.3, 5)
        return len(faces) > 0

    def stop(self) -> None:
        if self._cap is not None:
            self._cap.release()
            self._cap = None


if __name__ == "__main__":
    import time

    watcher = LocalPresenceWatcher()
    watcher.start()
    print("ローカルプレゼンス検知(デモ)。Ctrl+Cで終了。映像は保存・送信されません。")
    try:
        while True:
            print("在席中" if watcher.is_present() else "離席中")
            time.sleep(2)
    except KeyboardInterrupt:
        pass
    finally:
        watcher.stop()
