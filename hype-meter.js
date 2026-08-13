/* =========================================================
   🔊 盛り上がりメーター（マイク音量メーター）
   ---------------------------------------------------------
   ・Web Audio API (AnalyserNode) でマイクの音量をリアルタイム取得し、
     0〜100の「盛り上がり度」として正規化する
   ・⚠️ 正直な注意点：これは正式な「デシベル(dB SPL)」の測定ではない。
     マイクの感度・端末・環境ノイズで大きく変わるため、絶対値としての
     騒音レベルを正確に測ることはできない、あくまで「さっきより盛り
     上がってるか」を見るための目安値として設計している
   ・マイクへのアクセスは、ユーザーが🔊ボタンを押した（＝明確な操作をした）
     ときだけ要求する。ゲーム画面を離れたら自動でマイクを止める
     （game.jsのshowScreen()から呼ばれる）
   ========================================================= */

const HypeMeter = (() => {
  let audioCtx = null;
  let analyser = null;
  let dataArray = null;
  let stream = null;
  let rafId = null;
  let currentLevel = 0; // 0-100（正式なdBではない目安値）

  function isSupported() {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      (window.AudioContext || window.webkitAudioContext)
    );
  }

  function isRunning() {
    return !!audioCtx;
  }

  // マイクの使用許可を求め、成功したら計測を開始する。戻り値: 成功したかどうか
  async function start() {
    if (audioCtx) return true; // すでに起動中
    if (!isSupported()) return false;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      return false; // ユーザーが拒否した、またはマイクがない
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctor();
    const source = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.6;
    source.connect(analyser);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    tick();
    return true;
  }

  function tick() {
    if (!analyser) return;
    analyser.getByteTimeDomainData(dataArray);
    // 波形の振幅（RMS：中心128からのズレの二乗平均平方根）を音量の目安にする
    let sumSquares = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const v = (dataArray[i] - 128) / 128;
      sumSquares += v * v;
    }
    const rms = Math.sqrt(sumSquares / dataArray.length);
    currentLevel = Math.min(100, Math.round(rms * 400)); // 係数は体感で調整した目安値
    rafId = requestAnimationFrame(tick);
  }

  // マイクを止める（ストリームを完全に解放する。プライバシーのため、使わない間は必ず止める）
  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    if (audioCtx) {
      audioCtx.close();
      audioCtx = null;
    }
    analyser = null;
    currentLevel = 0;
  }

  function getLevel() {
    return currentLevel;
  }

  return { isSupported, isRunning, start, stop, getLevel };
})();
