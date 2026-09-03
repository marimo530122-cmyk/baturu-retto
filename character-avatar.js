/* =========================================================
   🎭 飲み友AI - キャラクターアバター（SVG手続き描画 + 口パク）
   ---------------------------------------------------------
   ・正直な設計方針: 「本物の動画」は用意していない（実在の人物や
     既存キャラクターに似せた映像・画像素材の調達は著作権・肖像権上の
     リスクが大きく、この案件の方針とも合わない）。代わりに、SVGで
     各キャラクターの顔を描き、音声のタイミングに合わせて口・視線・
     瞬きをリアルタイムに動かすことで「本当にしゃべっている感じ」を
     出す方向にした（utubyou AI（Sanctuary）プロジェクトで先に作った
     同種の仕組みを、この9〜11キャラクター向けに移植・拡張したもの）。
   ・LipSync: SpeechSynthesisは合成波形をWeb Audio APIに渡せないため、
     `boundary`イベント（発話中の単語の区切り）ごとに「開いて自然に
     閉じる」エンベロープを生成する疑似リップシンク。
   ========================================================= */

const LipSync = (() => {
  let openness = 0;
  let target = 0;
  let rafId = null;
  let fallbackTimer = null;
  let lastBoundaryAt = 0;
  let speaking = false;

  function onBoundary(e) {
    lastBoundaryAt = performance.now();
    const charLen = e.charLength || 4;
    target = Math.min(1, 0.4 + charLen * 0.08);
  }

  function onStart() {
    speaking = true;
    lastBoundaryAt = 0;
    startLoop();
    startFallback();
  }

  function onEnd() {
    speaking = false;
    target = 0;
    if (fallbackTimer) clearInterval(fallbackTimer);
    fallbackTimer = null;
  }

  function startFallback() {
    if (fallbackTimer) return;
    fallbackTimer = setInterval(() => {
      if (!speaking) return;
      const since = performance.now() - lastBoundaryAt;
      if (lastBoundaryAt === 0 || since > 500) {
        target = 0.45 + Math.random() * 0.3;
      }
    }, 220);
  }

  function startLoop() {
    if (rafId) return;
    function tick() {
      const rate = openness < target ? 0.55 : 0.12;
      openness += (target - openness) * rate;
      target *= 0.85;
      if (openness < 0.02 && !speaking) {
        openness = 0;
        rafId = null;
        return;
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
  }

  // speakOdai() にそのまま渡せる形（onBoundary/onStart/onEnd）で返す
  function hooks() {
    return { onBoundary, onStart, onEnd };
  }

  function getOpenness() {
    return openness;
  }

  return { hooks, getOpenness };
})();

/* ---------------------------------------------------------
   キャラクターごとの見た目設定（肌色・アクセントカラー・髪型/装飾）
   --------------------------------------------------------- */
const CHARACTER_VISUALS = {
  tagosaku: { skin: "#c9a877", accent: "#4a3a2a", cheek: "#d88a6a", topper: "oyaji" },
  yukimama: { skin: "#e8c9a8", accent: "#6a1a35", cheek: "#e8a0a8", topper: "mama" },
  miyu: { skin: "#f0d0b8", accent: "#ff6bb5", cheek: "#ff9ac2", topper: "gal" },
  pochi: { skin: "#c9a877", accent: "#a9865c", cheek: "#e8a0a0", topper: "dog" },
  zon: { skin: "#93ad82", accent: "#3f4f34", cheek: "#7a9a68", topper: "zombie" },
  dandy: { skin: "#e0b08c", accent: "#1c1c26", cheek: "#e8a0a0", topper: "dandy" },
  shibu: { skin: "#d8b090", accent: "#20222a", cheek: "#c8895f", topper: "shibu" },
  luna: { skin: "#e8bfa0", accent: "#2a1436", cheek: "#e88ca0", topper: "luna" },
  nagi: { skin: "#e0b08c", accent: "#1e1e22", cheek: "#e0a080", topper: "nagi" },
  reika: { skin: "#e8c9a8", accent: "#3a1a5a", cheek: "#e0a0c0", topper: "fortune" },
  zero: { skin: "#c8d2e2", accent: "#3a5a8a", cheek: "#a8c8e8", topper: "robot" },
};

function toppperSvg(kind, accent) {
  switch (kind) {
    case "oyaji":
      // 後退した生え際・もみあげ・口ひげ
      return `
        <path d="M 40 70 Q 100 20 160 70 L 160 85 Q 100 55 40 85 Z" fill="${accent}" opacity="0.85"/>
        <path d="M 82 128 Q 100 138 118 128 Q 100 133 82 128 Z" fill="${accent}"/>`;
    case "mama":
      // 上品なまとめ髪＋簪
      return `
        <path d="M 35 90 Q 30 20 100 18 Q 170 20 165 90 Q 150 50 100 45 Q 50 50 35 90 Z" fill="${accent}"/>
        <circle cx="100" cy="30" r="6" fill="${accent}"/>
        <line x1="100" y1="24" x2="112" y2="8" stroke="#ffd7e6" stroke-width="2.5" stroke-linecap="round"/>`;
    case "gal":
      // 明るいツインテール
      return `
        <ellipse cx="38" cy="95" rx="16" ry="42" fill="${accent}" transform="rotate(-18 38 95)"/>
        <ellipse cx="162" cy="95" rx="16" ry="42" fill="${accent}" transform="rotate(18 162 95)"/>
        <path d="M 40 55 Q 100 10 160 55 L 155 78 Q 100 40 45 78 Z" fill="${accent}"/>`;
    case "dog":
      return `
        <ellipse cx="52" cy="70" rx="16" ry="34" fill="${accent}" transform="rotate(-16 52 70)"/>
        <ellipse cx="148" cy="70" rx="16" ry="34" fill="${accent}" transform="rotate(16 148 70)"/>`;
    case "zombie":
      // 乱れた髪
      return `
        <path d="M 35 75 L 45 30 L 60 60 L 72 20 L 88 58 L 100 15 L 112 58 L 128 20 L 140 60 L 155 30 L 165 75 Q 100 45 35 75 Z" fill="${accent}"/>`;
    case "dandy":
      // シルクハット＋モノクル
      return `
        <rect x="70" y="8" width="60" height="18" rx="3" fill="${accent}"/>
        <rect x="78" y="-22" width="44" height="34" rx="2" fill="${accent}"/>
        <circle cx="128" cy="128" r="14" fill="none" stroke="#c9a877" stroke-width="2.5"/>`;
    case "shibu":
      // 短髪＋サングラス
      return `
        <path d="M 42 68 Q 100 28 158 68 L 158 82 Q 100 50 42 82 Z" fill="${accent}"/>
        <rect x="68" y="108" width="64" height="16" rx="8" fill="#141418" opacity="0.92"/>`;
    case "luna":
      // 長い黒髪
      return `
        <path d="M 38 100 C 32 130 34 175 46 200 C 50 170 52 145 55 125 C 34 60 66 24 100 24 C 134 24 166 60 145 125 C 148 145 150 170 154 200 C 166 175 168 130 162 100 C 168 55 138 18 100 18 C 62 18 32 55 38 100 Z" fill="${accent}"/>`;
    case "nagi":
      // ちょんまげ＋鉢巻
      return `
        <ellipse cx="100" cy="14" rx="14" ry="10" fill="${accent}"/>
        <rect x="30" y="55" width="140" height="14" rx="6" fill="#7a1a1a"/>
        <path d="M 42 60 Q 100 32 158 60 L 158 70 Q 100 48 42 70 Z" fill="${accent}"/>`;
    case "fortune":
      // ターバン＋三日月と星の飾り
      return `
        <path d="M 34 78 Q 30 12 100 10 Q 170 12 166 78 Q 150 40 100 38 Q 50 40 34 78 Z" fill="${accent}"/>
        <circle cx="100" cy="16" r="7" fill="#f0c419"/>
        <path d="M 82 12 a 8 8 0 1 0 8 -12 a 6 6 0 1 1 -8 12 Z" fill="#f0c419"/>
        <circle cx="60" cy="60" r="4" fill="#f0c419"/>
        <circle cx="140" cy="60" r="4" fill="#f0c419"/>`;
    case "robot":
      // アンテナ＋ヘッドセット風パーツ
      return `
        <rect x="88" y="4" width="6" height="20" fill="${accent}"/>
        <circle cx="91" cy="4" r="6" fill="#7fd8ff" class="ra-antenna-glow"/>
        <rect x="30" y="80" width="16" height="40" rx="8" fill="${accent}"/>
        <rect x="154" y="80" width="16" height="40" rx="8" fill="${accent}"/>`;
    default:
      return "";
  }
}

/* ---------------------------------------------------------
   1体分のアバターSVGを生成する
   --------------------------------------------------------- */
function buildCharacterAvatarSvg(characterId) {
  const v = CHARACTER_VISUALS[characterId] || CHARACTER_VISUALS.tagosaku;
  const isRobot = v.topper === "robot";
  return `
  <svg viewBox="0 0 200 220" class="roast-avatar-svg" aria-hidden="true">
    <defs>
      <radialGradient id="ravatarGlow-${characterId}" cx="50%" cy="35%" r="65%">
        <stop offset="0%" stop-color="${v.accent}" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="${v.accent}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="100" cy="105" r="98" fill="url(#ravatarGlow-${characterId})"/>
    ${toppperSvg(v.topper, v.accent)}
    <circle cx="100" cy="112" r="62" fill="${v.skin}"/>
    <circle cx="66" cy="130" r="9" fill="${v.cheek}" opacity="0.4"/>
    <circle cx="134" cy="130" r="9" fill="${v.cheek}" opacity="0.4"/>
    <path class="ra-brow ra-brow-l" d="M 72 96 Q 82 90 92 96" stroke="${v.accent}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7"/>
    <path class="ra-brow ra-brow-r" d="M 108 96 Q 118 90 128 96" stroke="${v.accent}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7"/>
    <g class="ra-eye" style="transform-box: view-box; transform-origin: 82px 108px;">
      <ellipse cx="82" cy="108" rx="7" ry="${isRobot ? 5 : 8}" fill="${isRobot ? "#0d1420" : "#f5f0e8"}"/>
      <circle class="ra-pupil ra-pupil-l" cx="82" cy="108" r="4" fill="${isRobot ? "#7fd8ff" : "#2a2820"}"/>
    </g>
    <g class="ra-eye" style="transform-box: view-box; transform-origin: 118px 108px;">
      <ellipse cx="118" cy="108" rx="7" ry="${isRobot ? 5 : 8}" fill="${isRobot ? "#0d1420" : "#f5f0e8"}"/>
      <circle class="ra-pupil ra-pupil-r" cx="118" cy="108" r="4" fill="${isRobot ? "#7fd8ff" : "#2a2820"}"/>
    </g>
    <ellipse cx="100" cy="128" rx="3" ry="4" fill="${v.accent}" opacity="0.35"/>
    <ellipse class="ra-mouth" cx="100" cy="148" rx="15" ry="2.5" fill="${isRobot ? "#0d1420" : "#5a3838"}"/>
  </svg>`;
}

/* ---------------------------------------------------------
   マウント中のアバターを毎フレーム更新する（口・視線・眉）
   --------------------------------------------------------- */
const CharacterAvatar = (() => {
  let container = null;
  let rafId = null;

  function mount(el, characterId) {
    unmount();
    container = el;
    container.innerHTML = buildCharacterAvatarSvg(characterId);
    tick();
  }

  function unmount() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    container = null;
  }

  function tick() {
    if (!container) return;
    const openness = LipSync.getOpenness();
    const mouth = container.querySelector(".ra-mouth");
    if (mouth) mouth.setAttribute("ry", String(2.5 + openness * 15));

    const sec = performance.now() / 1000;
    const gazeX = Math.sin(sec * 0.4) * 1.6 + Math.sin(sec * 0.13) * 0.8;
    const gazeY = Math.cos(sec * 0.3) * 1;
    container.querySelectorAll(".ra-pupil").forEach((p) => {
      p.setAttribute("transform", `translate(${gazeX} ${gazeY})`);
    });

    const browLift = -openness * 2;
    container.querySelectorAll(".ra-brow").forEach((b) => {
      b.setAttribute("transform", `translate(0 ${browLift})`);
    });

    rafId = requestAnimationFrame(tick);
  }

  return { mount, unmount };
})();
