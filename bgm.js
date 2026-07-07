/* =========================================================
   ジャズバー風BGM
   音楽ファイルを使わず、ブラウザの音の機能（Web Audio API）で
   ウッドベース・ピアノ・シンバルを自動演奏する。
   著作権フリー＆読み込み0秒。
   ---------------------------------------------------------
   使い方:
     BGM.toggle();   // 再生／停止の切り替え（結果を true/false で返す）
     BGM.duck(true); // 読み上げ中などにBGMを一時的に小さくする
   ========================================================= */

const BGM = (() => {
  let ctx = null;      // 音の心臓部（最初のタップ時に作る決まり）
  let master = null;   // 全体の音量つまみ
  let timer = null;
  let playing = false;
  let step = 0;
  let nextTime = 0;

  const TEMPO = 88;            // ゆったりしたジャズバーのテンポ
  const BEAT = 60 / TEMPO;     // 1拍の長さ（秒）

  // ジャズ定番のコード進行（Dm7 → G7 → Cmaj7 → A7 を延々ループ）
  // bass: ウッドベースの歩き（ウォーキングベース）
  // chord: ピアノが「ジャーン」と添える和音
  const BARS = [
    { bass: [38, 41, 45, 44], chord: [62, 65, 69] }, // Dm7
    { bass: [43, 47, 41, 37], chord: [59, 65, 69] }, // G7
    { bass: [36, 40, 43, 44], chord: [64, 67, 71] }, // Cmaj7
    { bass: [45, 49, 52, 39], chord: [61, 64, 67] }, // A7
  ];

  // 音の番号（MIDI）を周波数に変換
  const freq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  // シンバル用のノイズ音源
  let noiseBuffer = null;
  function makeNoise() {
    const len = Math.floor(ctx.sampleRate * 0.12);
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  // ウッドベース風の音
  function bass(midi, t) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = "triangle";
    osc.frequency.value = freq(midi);
    filter.type = "lowpass";
    filter.frequency.value = 420;
    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + BEAT * 0.95);
    osc.connect(filter).connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + BEAT);
  }

  // ピアノ風の和音
  function chord(midis, t) {
    midis.forEach((m) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = "triangle";
      osc.frequency.value = freq(m);
      filter.type = "lowpass";
      filter.frequency.value = 1400;
      gain.gain.setValueAtTime(0.035, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.connect(filter).connect(gain).connect(master);
      osc.start(t);
      osc.stop(t + 0.6);
    });
  }

  // ライドシンバル風の「チーン」
  function ride(t, accent) {
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    src.buffer = noiseBuffer;
    filter.type = "highpass";
    filter.frequency.value = 6000;
    gain.gain.setValueAtTime(accent ? 0.05 : 0.03, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    src.connect(filter).connect(gain).connect(master);
    src.start(t);
  }

  // 1拍ぶんの演奏を予約する
  function scheduleBeat(globalStep, t) {
    const bar = Math.floor(globalStep / 4) % BARS.length;
    const beat = globalStep % 4;
    bass(BARS[bar].bass[beat], t);
    ride(t, beat === 0);
    // 2拍目と4拍目にピアノとスウィングの「チッ」を入れるとジャズっぽくなる
    if (beat === 1 || beat === 3) {
      chord(BARS[bar].chord, t);
      ride(t + (BEAT * 2) / 3, false);
    }
  }

  // 少し先の演奏を予約し続ける係
  function tick() {
    while (nextTime < ctx.currentTime + 0.35) {
      scheduleBeat(step, nextTime);
      step++;
      nextTime += BEAT;
    }
  }

  function start() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false; // 音が出せないブラウザでは何もしない
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 1;
      master.connect(ctx.destination);
      makeNoise();
    }
    ctx.resume();
    step = 0;
    nextTime = ctx.currentTime + 0.1;
    timer = setInterval(tick, 100);
    playing = true;
    return true;
  }

  function stop() {
    clearInterval(timer);
    playing = false;
  }

  function toggle() {
    if (playing) {
      stop();
    } else {
      start();
    }
    return playing;
  }

  // 読み上げ中はBGMを小さくして、声を聞き取りやすくする
  function duck(on) {
    if (!ctx || !master) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(on ? 0.22 : 1, ctx.currentTime, 0.15);
  }

  return {
    toggle,
    duck,
    get playing() {
      return playing;
    },
  };
})();
