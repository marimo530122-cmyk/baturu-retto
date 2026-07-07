/* =========================================================
   バツルーレット - ゲーム本体
   ・ワンクリック完結ルーレット（1回で全部決まる）
   ・👑王様モード（10%の確率で発動）
   ・日本語／英語 切り替え
   （お題の生成は odai-generator.js が担当）
   ========================================================= */

/* ---------------- 王様モードの発動確率 ---------------- */
const KING_CHANCE = 0.10; // 10%

/* ---------------- 言語の切り替え順番 ---------------- */
const LANG_CYCLE = ["ja", "en", "zh"];

/* ---------------- 状態（ゲームの記憶） ---------------- */
const state = {
  lang: "ja",          // "ja" = 日本語 / "en" = 英語 / "zh" = 繁體中文
  mode: "mf",          // "mf" = 男女に分ける / "all" = 全員一緒
  men: [],
  women: [],
  everyone: [],
  currentSpeech: null, // 「もう一度読み上げ」用
  currentPair: null,   // パス用（同じ2人でお題だけ変える）
  isKing: false,
  voicePersona: "random", // 声のキャラクター（random / mc / oyaji / girl）
  currentVoice: null,     // 今回の読み上げに使った声（もう一度読み上げ用）
};

/* ---------------- 声のキャラクター ---------------- */
const PERSONAS = {
  mc:    { emoji: "🎤", pitch: 1.1,  rate: 1.0,  gender: null },     // 標準MC
  oyaji: { emoji: "👨", pitch: 0.45, rate: 0.9,  gender: "male" },   // 渋いおやじ
  girl:  { emoji: "👧", pitch: 1.6,  rate: 1.05, gender: "female" }, // かわいい女子
};
const PERSONA_CYCLE = ["random", "mc", "oyaji", "girl"];

// 「おまかせ」なら毎回ランダムに声を決める
function resolveVoice() {
  const key =
    state.voicePersona === "random"
      ? ["mc", "oyaji", "girl"][Math.floor(Math.random() * 3)]
      : state.voicePersona;
  state.currentVoice = PERSONAS[key];
  return state.currentVoice;
}

/* ---------------- 日本語／英語の文言集 ---------------- */
const UI = {
  ja: {
    langBtn: "🌐 English",
    sub: "飲み会を爆上げする",
    logoHTML: 'バツ<span class="neon-purple">ルーレット</span>',
    tag: "罰ゲーム2,500通り × 👑王様モード × 司会者ボイス",
    free: "＼ 今すぐ無料で遊べる！ ／",
    start: "🎰 はじめる",
    premiumHeading: "✨ 有料版（じゅんび中）",
    packs: {
      adult: "🔞 大人向け",
      family: "👨‍👩‍👧 ファミリー",
      couple: "💑 1対1モード",
    },
    noticeHTML: "※20歳未満の飲酒は法律で禁止されています。<br>お酒やお題の無理強いはやめましょう。",
    setupTitle: "メンバー登録",
    modeMf: "男女に分ける",
    modeAll: "全員一緒",
    teamM: "♂ 男性チーム",
    teamF: "♀ 女性チーム",
    teamA: "🍻 参加メンバー",
    placeholder: "名前を入力",
    add: "追加",
    gameStart: "🎲 ゲームスタート！",
    backTitle: "← タイトルへ戻る",
    backSetup: "← メンバーを変える",
    msgDup: "同じ名前がすでに登録されています",
    msgMax: "登録できるのは12人までです",
    msgNeedMf: "男性・女性それぞれ1人以上、合計3人以上を登録してください",
    msgNeedAll: "3人以上を登録してください",
    coupleTeaser: "2人きりで遊ぶなら「1対1モード」がおすすめ！ 有料版のコンテンツです。",
    packTeaser: (packName) => `「${packName}」は有料版のコンテンツです。`,
    modalTitle: "✨ 有料版のご案内 ✨",
    modalPrice: "買い切り 480円（現在準備中です。お楽しみに！）",
    modalClose: "とじる",
    voices: {
      random: "🎲 声はおまかせ（毎回変わる）",
      mc: "🎤 標準MC",
      oyaji: "👨 渋いおやじ",
      girl: "👧 かわいい女子",
    },
    voiceSample: {
      mc: "私が読み上げます！",
      oyaji: "わしが、読み上げるぞ。",
      girl: "私が読むね！",
    },
    bgmOn: "🎷 ジャズBGM オン",
    bgmOff: "🎷 ジャズBGM オフ",
    statusStart: "🎯 罰ゲームをやる人は…！？",
    spinBtn: "🎰 ルーレット スタート！",
    statusPicked: (name) => `やる人は…【${name}】！`,
    statusOdai: "🔥 お題はこれだ！",
    statusKing: "👑 王様、誕生！！",
    kingCard: (name) =>
      `👑 王様、誕生！！\n\n王様は【${name}】！\n\n王様の命令は絶対！\nみんなへのお題を自由に出そう！`,
    kingSpeech: (name) =>
      `王様は、${name}さん！王様の命令は、絶対！好きなお題を出してください！`,
    speak: "🔊 もう一度読み上げ",
    pass: "🔄 パス（お題を変える）",
    next: "🎰 次のルーレットへ！",
  },
  en: {
    langBtn: "🌐 中文",
    sub: "The ultimate party starter",
    logoHTML: 'Batsu <span class="neon-purple">Roulette</span>',
    tag: "2,500 challenges × 👑 King Mode × MC voice",
    free: "＼ Play FREE right now! ／",
    start: "🎰 PLAY NOW",
    premiumHeading: "✨ Premium (coming soon)",
    packs: {
      adult: "🔞 Adults Only",
      family: "👨‍👩‍👧 Family",
      couple: "💑 Couple Mode",
    },
    noticeHTML: "Please drink responsibly and only if you are of legal age.<br>Never pressure anyone to drink or do a challenge.",
    setupTitle: "Add Players",
    modeMf: "Guys vs Girls",
    modeAll: "Everyone together",
    teamM: "♂ Team Guys",
    teamF: "♀ Team Girls",
    teamA: "🍻 Players",
    placeholder: "Enter name",
    add: "Add",
    gameStart: "🎲 START GAME!",
    backTitle: "← Back to title",
    backSetup: "← Change players",
    msgDup: "That name is already registered",
    msgMax: "You can register up to 12 players",
    msgNeedMf: "Add at least 1 guy, 1 girl, and 3 players in total",
    msgNeedAll: "Add at least 3 players",
    coupleTeaser: "Just the two of you? Try Couple Mode — part of the premium version!",
    packTeaser: (packName) => `"${packName}" is part of the premium version.`,
    modalTitle: "✨ Premium Version ✨",
    modalPrice: "One-time purchase $3.99 (coming soon!)",
    modalClose: "Close",
    voices: {
      random: "🎲 Surprise voice (changes every time)",
      mc: "🎤 Standard MC",
      oyaji: "👨 Deep old-guy voice",
      girl: "👧 Cute girl voice",
    },
    voiceSample: {
      mc: "I'll read the challenges!",
      oyaji: "I shall read them for you.",
      girl: "I'll read them, let's go!",
    },
    bgmOn: "🎷 Jazz BGM ON",
    bgmOff: "🎷 Jazz BGM OFF",
    statusStart: "🎯 Who's getting the challenge...!?",
    spinBtn: "🎰 SPIN THE WHEEL!",
    statusPicked: (name) => `It's... 【${name}】!`,
    statusOdai: "🔥 HERE'S THE CHALLENGE!",
    statusKing: "👑 ALL HAIL THE KING!",
    kingCard: (name) =>
      `👑 ALL HAIL THE KING!\n\nThe King is 【${name}】!\n\nThe King's command is absolute!\nMake up any challenge you want!`,
    kingSpeech: (name) =>
      `The King is ${name}! The King's command is absolute! Make up any challenge you want!`,
    speak: "🔊 Read it again",
    pass: "🔄 Pass (new challenge)",
    next: "🎰 NEXT SPIN!",
  },
  zh: {
    langBtn: "🌐 日本語",
    sub: "讓聚會嗨翻天",
    logoHTML: '罰遊戲<span class="neon-purple">大轉盤</span>',
    tag: "2,500種懲罰 × 👑國王模式 × 主持人語音",
    free: "＼ 現在就能免費開玩！／",
    start: "🎰 開始遊戲",
    premiumHeading: "✨ 付費版（準備中）",
    packs: {
      adult: "🔞 成人限定",
      family: "👨‍👩‍👧 家庭版",
      couple: "💑 兩人模式",
    },
    noticeHTML: "※未成年請勿飲酒。<br>請勿強迫他人喝酒或做懲罰遊戲。",
    setupTitle: "新增玩家",
    modeMf: "男女分隊",
    modeAll: "全部一起",
    teamM: "♂ 男生隊",
    teamF: "♀ 女生隊",
    teamA: "🍻 參加者",
    placeholder: "輸入名字",
    add: "新增",
    gameStart: "🎲 開始遊戲！",
    backTitle: "← 返回標題",
    backSetup: "← 更改成員",
    msgDup: "這個名字已經登記過了",
    msgMax: "最多只能登記12人",
    msgNeedMf: "男生、女生請至少各登記1人，總共至少3人",
    msgNeedAll: "請登記至少3人",
    coupleTeaser: "只有兩個人嗎？「兩人模式」最適合你們！這是付費版的內容。",
    packTeaser: (packName) => `「${packName}」是付費版的內容。`,
    modalTitle: "✨ 付費版介紹 ✨",
    modalPrice: "買斷制 NT$90（目前準備中，敬請期待！）",
    modalClose: "關閉",
    voices: {
      random: "🎲 隨機語音（每次不同）",
      mc: "🎤 標準主持人",
      oyaji: "👨 低沉大叔音",
      girl: "👧 可愛女生音",
    },
    voiceSample: {
      mc: "由我來宣布題目！",
      oyaji: "由我來唸題目吧。",
      girl: "我來唸題目囉！",
    },
    bgmOn: "🎷 爵士配樂 開啟",
    bgmOff: "🎷 爵士配樂 關閉",
    statusStart: "🎯 誰會被抽到呢…！？",
    spinBtn: "🎰 轉動輪盤！",
    statusPicked: (name) => `是…【${name}】！`,
    statusOdai: "🔥 題目來了！",
    statusKing: "👑 國王誕生！！",
    kingCard: (name) =>
      `👑 國王誕生！！\n\n國王是【${name}】！\n\n國王的命令是絕對的！\n盡情對大家出題吧！`,
    kingSpeech: (name) =>
      `國王是，${name}！國王的命令是絕對的！請自由對大家出題！`,
    speak: "🔊 再唸一次",
    pass: "🔄 跳過（換一題）",
    next: "🎰 下一輪！",
  },
};

function t(key) {
  return UI[state.lang][key];
}

/* ---------------- 言語の適用 ---------------- */
function applyLanguage() {
  const u = UI[state.lang];
  document.documentElement.lang = state.lang;

  document.getElementById("btn-lang").textContent = u.langBtn;
  document.getElementById("t-sub").textContent = u.sub;
  document.getElementById("t-logo").innerHTML = u.logoHTML;
  document.getElementById("t-tag").textContent = u.tag;
  document.getElementById("t-free").textContent = u.free;
  document.getElementById("btn-start").textContent = u.start;
  document.getElementById("t-premium-heading").textContent = u.premiumHeading;
  document.getElementById("pack-adult").innerHTML = `${u.packs.adult} <span class="lock">🔒</span>`;
  document.getElementById("pack-family").innerHTML = `${u.packs.family} <span class="lock">🔒</span>`;
  document.getElementById("pack-couple").innerHTML = `${u.packs.couple} <span class="lock">🔒</span>`;
  document.getElementById("t-notice").innerHTML = u.noticeHTML;

  document.getElementById("t-setup-title").textContent = u.setupTitle;
  document.getElementById("mode-mf").textContent = u.modeMf;
  document.getElementById("mode-all").textContent = u.modeAll;
  document.getElementById("t-team-m").textContent = u.teamM;
  document.getElementById("t-team-f").textContent = u.teamF;
  document.getElementById("t-team-a").textContent = u.teamA;
  ["input-m", "input-f", "input-a"].forEach((id) => {
    document.getElementById(id).placeholder = u.placeholder;
  });
  ["add-m", "add-f", "add-a"].forEach((id) => {
    document.getElementById(id).textContent = u.add;
  });
  document.getElementById("btn-game-start").textContent = u.gameStart;
  document.getElementById("btn-back-title").textContent = u.backTitle;
  document.getElementById("btn-back-setup").textContent = u.backSetup;

  document.getElementById("btn-spin").textContent = u.spinBtn;
  document.getElementById("btn-speak").textContent = u.speak;
  document.getElementById("btn-pass").textContent = u.pass;
  document.getElementById("btn-next").textContent = u.next;

  document.getElementById("t-modal-title").textContent = u.modalTitle;
  document.getElementById("t-modal-price").textContent = u.modalPrice;
  document.getElementById("modal-close").textContent = u.modalClose;
}

document.getElementById("btn-lang").addEventListener("click", () => {
  const i = LANG_CYCLE.indexOf(state.lang);
  state.lang = LANG_CYCLE[(i + 1) % LANG_CYCLE.length];
  try { localStorage.setItem("batsu-lang", state.lang); } catch (e) {}
  applyLanguage();
});

/* ---------------- ちいさなお知らせ表示（トースト） ---------------- */
let toastTimer = null;
function showToast(text) {
  const toast = document.getElementById("toast");
  toast.textContent = text;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 1800);
}

/* ---------------- 🎷 BGMボタン ---------------- */
const btnBgm = document.getElementById("btn-bgm");
btnBgm.addEventListener("click", () => {
  const on = BGM.toggle();
  btnBgm.classList.toggle("off", !on);
  showToast(on ? t("bgmOn") : t("bgmOff"));
});

/* ---------------- 🎙️ 声の切り替えボタン ---------------- */
const btnVoice = document.getElementById("btn-voice");

function updateVoiceButton() {
  btnVoice.textContent =
    state.voicePersona === "random" ? "🎲" : PERSONAS[state.voicePersona].emoji;
}

btnVoice.addEventListener("click", () => {
  const i = PERSONA_CYCLE.indexOf(state.voicePersona);
  state.voicePersona = PERSONA_CYCLE[(i + 1) % PERSONA_CYCLE.length];
  try { localStorage.setItem("batsu-voice", state.voicePersona); } catch (e) {}
  updateVoiceButton();
  showToast(t("voices")[state.voicePersona]);
  // どんな声か、その場でしゃべって聞かせる
  if (state.voicePersona !== "random") {
    speakOdai(t("voiceSample")[state.voicePersona], state.lang, PERSONAS[state.voicePersona]);
  }
});

/* ---------------- 画面の切り替え ---------------- */
const screens = {
  title: document.getElementById("screen-title"),
  setup: document.getElementById("screen-setup"),
  game: document.getElementById("screen-game"),
};

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.add("hidden"));
  screens[name].classList.remove("hidden");
  window.scrollTo(0, 0);
}

/* =========================================================
   タイトル画面
   ========================================================= */
document.getElementById("btn-start").addEventListener("click", () => {
  showScreen("setup");
});

// 有料版（ロック中）ボタン → ご案内モーダル
const modal = document.getElementById("modal-premium");
document.querySelectorAll(".btn-locked").forEach((btn) => {
  btn.addEventListener("click", () => {
    const packName = UI[state.lang].packs[btn.dataset.pack];
    document.getElementById("modal-text").textContent = t("packTeaser")(packName);
    modal.classList.remove("hidden");
  });
});
document.getElementById("modal-close").addEventListener("click", () => {
  modal.classList.add("hidden");
});

/* =========================================================
   メンバー登録画面
   ========================================================= */
const setupMessage = document.getElementById("setup-message");

document.getElementById("mode-mf").addEventListener("click", () => setMode("mf"));
document.getElementById("mode-all").addEventListener("click", () => setMode("all"));

function setMode(mode) {
  state.mode = mode;
  document.getElementById("mode-mf").classList.toggle("active", mode === "mf");
  document.getElementById("mode-all").classList.toggle("active", mode === "all");
  document.getElementById("setup-mf").classList.toggle("hidden", mode !== "mf");
  document.getElementById("setup-all").classList.toggle("hidden", mode !== "all");
  setupMessage.textContent = "";
}

setupAddButton("add-m", "input-m", state.men);
setupAddButton("add-f", "input-f", state.women);
setupAddButton("add-a", "input-a", state.everyone);

function setupAddButton(buttonId, inputId, list) {
  const input = document.getElementById(inputId);
  const add = () => {
    const name = input.value.trim();
    if (!name) return;
    if (allNames().includes(name)) {
      setupMessage.textContent = t("msgDup");
      return;
    }
    if (allNames().length >= 12) {
      setupMessage.textContent = t("msgMax");
      return;
    }
    list.push(name);
    input.value = "";
    setupMessage.textContent = "";
    renderChips();
    input.focus();
  };
  document.getElementById(buttonId).addEventListener("click", add);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") add();
  });
}

function allNames() {
  return state.mode === "mf" ? [...state.men, ...state.women] : [...state.everyone];
}

function renderChips() {
  renderChipList("list-m", state.men);
  renderChipList("list-f", state.women);
  renderChipList("list-a", state.everyone);
}

function renderChipList(elementId, list) {
  const el = document.getElementById(elementId);
  el.innerHTML = "";
  list.forEach((name, i) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = name;
    const del = document.createElement("button");
    del.textContent = "✕";
    del.addEventListener("click", () => {
      list.splice(i, 1);
      renderChips();
    });
    chip.appendChild(del);
    el.appendChild(chip);
  });
}

// ゲームスタート（人数チェックつき）
document.getElementById("btn-game-start").addEventListener("click", () => {
  if (state.mode === "mf") {
    const total = state.men.length + state.women.length;
    if (total === 2 && state.men.length === 1 && state.women.length === 1) {
      document.getElementById("modal-text").textContent = t("coupleTeaser");
      modal.classList.remove("hidden");
      return;
    }
    if (state.men.length < 1 || state.women.length < 1 || total < 3) {
      setupMessage.textContent = t("msgNeedMf");
      return;
    }
  } else {
    if (state.everyone.length === 2) {
      document.getElementById("modal-text").textContent = t("coupleTeaser");
      modal.classList.remove("hidden");
      return;
    }
    if (state.everyone.length < 3) {
      setupMessage.textContent = t("msgNeedAll");
      return;
    }
  }
  showScreen("game");
  startRound();
});

document.getElementById("btn-back-title").addEventListener("click", () => showScreen("title"));
document.getElementById("btn-back-setup").addEventListener("click", () => {
  speechSynthesis.cancel();
  showScreen("setup");
});

/* =========================================================
   ルーレット（くじ引きの見た目部分）
   ========================================================= */
const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const SIZE = 340;

// 高解像度スマホでもくっきり描く
const dpr = window.devicePixelRatio || 1;
canvas.width = SIZE * dpr;
canvas.height = SIZE * dpr;
ctx.scale(dpr, dpr);

let wheelEntries = [];
let wheelRotation = 0;
let spinning = false;

// チームごとのネオンカラー（男性=青系 / 女性=ピンク系 / 全員=交互）
const COLOR_M = ["#1d3f8f", "#173070"];
const COLOR_F = ["#8f1d5e", "#701747"];
const COLOR_A = ["#5e2d9e", "#8f1d5e", "#1d3f8f", "#3d1d8f"];

function segmentColor(entry, index) {
  if (entry.team === "m") return COLOR_M[index % COLOR_M.length];
  if (entry.team === "f") return COLOR_F[index % COLOR_F.length];
  return COLOR_A[index % COLOR_A.length];
}

function drawWheel() {
  const n = wheelEntries.length;
  const cx = SIZE / 2, cy = SIZE / 2, r = SIZE / 2 - 8;
  const seg = (Math.PI * 2) / n;

  ctx.clearRect(0, 0, SIZE, SIZE);

  for (let i = 0; i < n; i++) {
    const start = wheelRotation + i * seg;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + seg);
    ctx.closePath();
    ctx.fillStyle = segmentColor(wheelEntries[i], i);
    ctx.fill();
    ctx.strokeStyle = "#0b0716";
    ctx.lineWidth = 3;
    ctx.stroke();

    // 名前（長い名前は省略）
    let label = wheelEntries[i].name;
    if (label.length > 6) label = label.slice(0, 5) + "…";
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + seg / 2);
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${n <= 6 ? 19 : n <= 9 ? 16 : 13}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, r * 0.62, 0);
    ctx.restore();
  }

  // 外枠のネオンリング
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = "#ff2d95";
  ctx.lineWidth = 4;
  ctx.shadowColor = "#ff2d95";
  ctx.shadowBlur = 14;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 中央の丸
  ctx.beginPath();
  ctx.arc(cx, cy, 26, 0, Math.PI * 2);
  ctx.fillStyle = "#171028";
  ctx.fill();
  ctx.strokeStyle = "#8f4bff";
  ctx.lineWidth = 3;
  ctx.stroke();
}

// くるくる回して、ランダムに1人選ぶ
function spinWheel(onDone) {
  if (spinning || wheelEntries.length === 0) return;
  spinning = true;

  const n = wheelEntries.length;
  const seg = (Math.PI * 2) / n;
  const winnerIndex = Math.floor(Math.random() * n);

  // 当たりの扇形の中心が、真上の矢印（-90度）に来る角度を計算
  let target = -Math.PI / 2 - (winnerIndex + 0.5) * seg;
  while (target < wheelRotation + Math.PI * 2 * 4) target += Math.PI * 2; // 4周以上回す

  const startRotation = wheelRotation;
  const distance = target - startRotation;
  const duration = 3400;
  const startTime = performance.now();

  function frame(now) {
    const t2 = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - t2, 4); // だんだんゆっくり止まる
    wheelRotation = startRotation + distance * eased;
    drawWheel();
    if (t2 < 1) {
      requestAnimationFrame(frame);
    } else {
      spinning = false;
      onDone(wheelEntries[winnerIndex]);
    }
  }
  requestAnimationFrame(frame);
}

/* =========================================================
   ゲームの進行（ワンクリック完結）
   1回のスピンで「やる人」が決まり、相手は自動で選ばれて
   お題まで一気に発表される。10%の確率で王様モード！
   ========================================================= */
const gameStatus = document.getElementById("game-status");
const btnSpin = document.getElementById("btn-spin");
const btnPass = document.getElementById("btn-pass");
const wheelArea = document.getElementById("wheel-area");
const odaiArea = document.getElementById("odai-area");
const odaiCard = document.getElementById("odai-card");

function participants() {
  if (state.mode === "mf") {
    return [
      ...state.men.map((name) => ({ name, team: "m" })),
      ...state.women.map((name) => ({ name, team: "f" })),
    ];
  }
  return state.everyone.map((name) => ({ name, team: null }));
}

// 相手を自動で選ぶ（男女モード＝相手チームから / 全員モード＝本人以外から）
function pickPartner(winner) {
  const list = participants();
  const candidates =
    state.mode === "mf"
      ? list.filter((p) => p.team !== winner.team)
      : list.filter((p) => p.name !== winner.name);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// 1回戦の始まり
function startRound() {
  wheelEntries = participants();
  wheelRotation = 0;
  drawWheel();

  gameStatus.textContent = t("statusStart");
  btnSpin.textContent = t("spinBtn");
  btnSpin.disabled = false;
  wheelArea.classList.remove("hidden");
  odaiArea.classList.add("hidden");
  odaiCard.classList.remove("king-card");
}

btnSpin.addEventListener("click", () => {
  if (spinning) return;
  btnSpin.disabled = true;

  // このスピンが王様モードになるかどうか、先に運命を決めておく
  const kingRound = Math.random() < KING_CHANCE;

  spinWheel((winner) => {
    if (kingRound) {
      gameStatus.textContent = t("statusKing");
      setTimeout(() => showKing(winner), 700);
    } else {
      gameStatus.textContent = t("statusPicked")(winner.name);
      const partner = pickPartner(winner);
      setTimeout(() => showOdai(winner, partner), 900);
    }
  });
});

// お題の発表（生成 → 表示 → 朗読）
function showOdai(from, to) {
  state.isKing = false;
  state.currentPair = { from, to };

  const odai = generateOdai(from.name, to.name, state.lang);
  state.currentSpeech = odai.speechText;

  gameStatus.textContent = t("statusOdai");
  odaiCard.textContent = odai.displayText;
  odaiCard.classList.remove("king-card");
  btnPass.classList.remove("hidden");
  wheelArea.classList.add("hidden");
  odaiArea.classList.remove("hidden");

  speakOdai(odai.speechText, state.lang, resolveVoice());
}

// 👑 王様モード！
function showKing(king) {
  state.isKing = true;
  state.currentPair = null;
  state.currentSpeech = t("kingSpeech")(king.name);

  gameStatus.textContent = t("statusKing");
  odaiCard.textContent = t("kingCard")(king.name);
  odaiCard.classList.add("king-card");
  btnPass.classList.add("hidden"); // 王様の命令にパスはない！
  wheelArea.classList.add("hidden");
  odaiArea.classList.remove("hidden");

  speakOdai(state.currentSpeech, state.lang, resolveVoice());
}

// もう一度読み上げ（さっきと同じ声で）
document.getElementById("btn-speak").addEventListener("click", () => {
  if (state.currentSpeech) speakOdai(state.currentSpeech, state.lang, state.currentVoice);
});

// パス（同じ2人のまま、お題だけ変える）
btnPass.addEventListener("click", () => {
  if (!state.currentPair) return;
  odaiCard.style.animation = "none";
  void odaiCard.offsetWidth;
  odaiCard.style.animation = "";
  showOdai(state.currentPair.from, state.currentPair.to);
});

// 次のルーレットへ
document.getElementById("btn-next").addEventListener("click", () => {
  speechSynthesis.cancel();
  startRound();
});

/* ---------------- 初期化 ---------------- */
// 前回選んだ言語と声を覚えておく
try {
  const savedLang = localStorage.getItem("batsu-lang");
  if (LANG_CYCLE.includes(savedLang)) state.lang = savedLang;
  const savedVoice = localStorage.getItem("batsu-voice");
  if (PERSONA_CYCLE.includes(savedVoice)) state.voicePersona = savedVoice;
} catch (e) {}

// 一部のスマホは音声リストの読み込みが遅れるため、先に読み込みを促しておく
if ("speechSynthesis" in window) speechSynthesis.getVoices();

applyLanguage();
updateVoiceButton();
renderChips();
