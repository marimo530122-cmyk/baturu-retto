/* =========================================================
   効果音（SFX）
   BGMとは別に、ここぞという瞬間だけ鳴らす短い音。
   音源ファイルは使わず、その場で作る（著作権フリー）。
   ========================================================= */

const SFX = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    ctx.resume();
    return ctx;
  }

  // 1音を鳴らす（start秒後に、duration秒かけて減衰）
  function tone(freq, start, duration, type, peak) {
    const c = getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + start);
    gain.gain.setValueAtTime(0.0001, c.currentTime + start);
    gain.gain.linearRampToValueAtTime(peak, c.currentTime + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + duration);
    osc.connect(gain).connect(c.destination);
    osc.start(c.currentTime + start);
    osc.stop(c.currentTime + start + duration + 0.05);
  }

  // 🎰 スピン開始：駆け上がる「シュン！」
  function spinStart() {
    [440, 554, 659, 880].forEach((f, i) => tone(f, i * 0.045, 0.14, "triangle", 0.16));
  }

  // 🔥 お題発表：「ジャジャン！」
  function reveal() {
    tone(523.25, 0, 0.3, "triangle", 0.22);
    tone(659.25, 0.05, 0.3, "triangle", 0.2);
    tone(783.99, 0.1, 0.45, "triangle", 0.22);
  }

  // 👑 王様誕生：もっと豪華なファンファーレ
  function kingFanfare() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.13, 0.4, "square", 0.18));
  }

  return { spinStart, reveal, kingFanfare };
})();
