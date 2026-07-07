/* =========================================================
   BGM（3ジャンル切り替え対応）
   音楽ファイルを使わず、ブラウザの音の機能（Web Audio API）で
   自動演奏する。著作権フリー＆読み込み0秒。
   ---------------------------------------------------------
   使い方:
     BGM.toggle();        // 再生／停止の切り替え（結果を true/false で返す）
     BGM.setGenre("edm"); // "jazz" / "edm" / "enka" を切り替え
     BGM.duck(true);      // 読み上げ中などにBGMを一時的に小さくする
   ========================================================= */

const BGM_GENRES = ["jazz", "edm", "enka"];
const BGM_GENRE_EMOJI = { jazz: "🎷", edm: "🎧", enka: "🎤" };

const BGM = (() => {
  let ctx = null;      // 音の心臓部（最初のタップ時に作る決まり）
  let master = null;   // 全体の音量つまみ
  let timer = null;
  let playing = false;
  let step = 0;
  let nextTime = 0;
  let genre = "jazz";

  // 音の番号（MIDI）を周波数に変換
  const freq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  // ノイズ音源（シンバル・ハイハット用）
  let noiseBuffer = null;
  function makeNoise() {
    const len = Math.floor(ctx.sampleRate * 0.12);
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  /* =========================================================
     🎷 ジャズ：ウォーキングベース × ピアノ × ライドシンバル
     ========================================================= */
  const JAZZ = {
    tempo: 88,
    bars: [
      { bass: [38, 41, 45, 44], chord: [62, 65, 69] }, // Dm7
      { bass: [43, 47, 41, 37], chord: [59, 65, 69] }, // G7
      { bass: [36, 40, 43, 44], chord: [64, 67, 71] }, // Cmaj7
      { bass: [45, 49, 52, 39], chord: [61, 64, 67] }, // A7
    ],
    schedule(beat, globalStep, t) {
      const bar = Math.floor(globalStep / 4) % this.bars.length;
      const b = beat % 4;
      toneNote(freq(this.bars[bar].bass[b]), t, JAZZ_BEAT * 0.95, "triangle", 0.16, 420);
      noiseHit(t, b === 0 ? 0.05 : 0.03, 6000, 0.09);
      if (b === 1 || b === 3) {
        this.bars[bar].chord.forEach((m) =>
          toneNote(freq(m), t, 0.55, "triangle", 0.035, 1400)
        );
        noiseHit(t + (JAZZ_BEAT * 2) / 3, 0.03, 6000, 0.09);
      }
    },
  };
  let JAZZ_BEAT = 60 / JAZZ.tempo;

  /* =========================================================
     🎧 EDM：四つ打ちキック × ベース × 高音アルペジオ
     ========================================================= */
  const EDM = {
    tempo: 126,
    bars: [
      { root: 45, arp: [57, 60, 64, 67] }, // A
      { root: 43, arp: [55, 58, 62, 65] }, // G
      { root: 41, arp: [53, 57, 60, 64] }, // F
      { root: 43, arp: [55, 58, 62, 65] }, // G
    ],
    schedule(beat, globalStep, t) {
      const bar = Math.floor(globalStep / 4) % this.bars.length;
      const b = beat % 4;
      // キック（毎拍ドンドンと鳴る四つ打ち）
      kick(t);
      // ベース（キックの裏でうねる）
      toneNote(freq(this.bars[bar].root - 12), t, EDM_BEAT * 0.9, "sawtooth", 0.1, 300);
      // 8分刻みの高音アルペジオ
      const arp = this.bars[bar].arp;
      toneNote(freq(arp[b % arp.length]), t, 0.18, "square", 0.05, 2200);
      toneNote(freq(arp[(b + 2) % arp.length]), t + EDM_BEAT / 2, 0.18, "square", 0.045, 2200);
      // 2拍4拍のハイハット
      if (b === 1 || b === 3) noiseHit(t, 0.035, 8000, 0.05);
    },
  };
  let EDM_BEAT = 60 / EDM.tempo;

  /* =========================================================
     🎤 演歌：ゆったり五音音階のメロディ × 三味線風の撥音
     ========================================================= */
  const ENKA = {
    tempo: 68,
    // 陰音階（演歌・和風によく使われる音階）でメロディを構成
    bars: [
      { pluck: [57, 60, 62], melody: [69, 67, 65] },
      { pluck: [55, 58, 60], melody: [65, 62, 60] },
      { pluck: [53, 57, 58], melody: [62, 60, 57] },
      { pluck: [55, 58, 60], melody: [60, 62, 65] },
    ],
    schedule(beat, globalStep, t) {
      const bar = Math.floor(globalStep / 4) % this.bars.length;
      const b = beat % 4;
      if (b === 0) {
        this.bars[bar].pluck.forEach((m, i) =>
          toneNote(freq(m), t + i * 0.02, 0.9, "triangle", 0.05, 900)
        );
      }
      // メロディ（ゆっくりのビブラート風にピッチを揺らす）
      const melodyNote = this.bars[bar].melody[b % this.bars[bar].melody.length];
      vibratoNote(freq(melodyNote), t, ENKA_BEAT * 0.95, 0.09);
    },
  };
  let ENKA_BEAT = 60 / ENKA.tempo;

  const GENRE_MAP = { jazz: JAZZ, edm: EDM, enka: ENKA };
  const BEAT_MAP = { jazz: () => JAZZ_BEAT, edm: () => EDM_BEAT, enka: () => ENKA_BEAT };

  /* ---------------------------------------------------------
     共通の音源パーツ
     --------------------------------------------------------- */

  // 1音を鳴らす（減衰つき）
  function toneNote(f, t, dur, type, peak, lowpassFreq) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = type;
    osc.frequency.value = f;
    filter.type = "lowpass";
    filter.frequency.value = lowpassFreq;
    gain.gain.setValueAtTime(peak, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(filter).connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // ビブラートのかかった1音（演歌用）
  function vibratoNote(f, t, dur, peak) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = f;
    lfo.frequency.value = 5.5; // ゆらぎの速さ
    lfoGain.gain.value = 6; // ゆらぎの深さ（Hz）
    lfo.connect(lfoGain).connect(osc.frequency);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(master);
    lfo.start(t);
    osc.start(t);
    lfo.stop(t + dur + 0.05);
    osc.stop(t + dur + 0.05);
  }

  // ノイズのヒット音（シンバル・ハイハット共通）
  function noiseHit(t, peak, highpassFreq, dur) {
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    src.buffer = noiseBuffer;
    filter.type = "highpass";
    filter.frequency.value = highpassFreq;
    gain.gain.setValueAtTime(peak, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(gain).connect(master);
    src.start(t);
  }

  // EDM用のキック（低音がドンと鳴って一瞬でピッチが下がる）
  function kick(t) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  /* ---------------------------------------------------------
     再生の進行管理
     --------------------------------------------------------- */

  function scheduleBeat(globalStep, t) {
    const beat = globalStep % 4;
    GENRE_MAP[genre].schedule(beat, globalStep, t);
  }

  function tick() {
    const beatLen = BEAT_MAP[genre]();
    while (nextTime < ctx.currentTime + 0.35) {
      scheduleBeat(step, nextTime);
      step++;
      nextTime += beatLen;
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

  // ジャンルを切り替える（鳴らしたまま切り替えてもOK）
  function setGenre(name) {
    if (!GENRE_MAP[name]) return;
    genre = name;
    step = 0;
    if (ctx) nextTime = ctx.currentTime + 0.1;
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
    setGenre,
    get playing() {
      return playing;
    },
    get genre() {
      return genre;
    },
  };
})();
