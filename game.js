/* =========================================================
   バツルーレット - ゲーム本体
   ・ワンクリック完結ルーレット（1回で全部決まる）
   ・👑王様モード（標準10%＝全員に自由命令／🔞大人向けパックのみ50%＝対象者2人を指名して罰を命じる）
   ・日本語／英語 切り替え
   （お題の生成は odai-generator.js が担当）
   ========================================================= */

/* ---------------- 王様モードの発動確率 ---------------- */
// 🔞大人向けパックのときだけ、王様は対象者2人を指名し、その場で自由に罰の
// 内容を考える（ノーガードではなく、画面に安全ガイド＝宗教政治NG・強要飲酒NG・
// 接触はソフトタッチまで・外見いじりNG・パス自由を毎回リマインド表示して歯止めをかける）。
// それ以外のパック（標準・ファミリー・ノンアル等）は、従来通り対象を指定しない
// 「みんなへの自由命令」のまま、発動率も低めに保つ。
const KING_CHANCE_STANDARD = 0.10; // 10%（標準パック等）
const KING_CHANCE_ADULT = 0.50; // 50%（🔞大人向けパックのみ）

/* ---------------- 王様の「不成立が続いたら少し当たりやすくする」補正 ----------------
   完全な確率通りだと「10回中0回」のような偏りが体感を悪くする（実際には約35%の確率で
   起こりうる範囲内の分散でも、ユーザーには「壊れてる」「不公平」に見える）。
   王様不成立のラウンドが続くほど当選率をわずかに底上げし、外れ続ける体験を和らげる。
   上限を設けて確率を歪めすぎないようにする（1回あたり+1.5%、最大+20%まで）。 */
const KING_DRY_STREAK_STEP = 0.015;
const KING_DRY_STREAK_CAP = 0.20;

/* ---------------- 🧑‍⚖️ 審査員ハプニングモードの発動確率 ---------------- */
// 王様モードでない回のうち、この確率で「今回の審査員」が参加者の中から
// ランダムに指名される(通常のお題に一言添えるだけの演出)。実際に何か
// 追加でやらせるかどうかの判定・内容はアプリでは決めず、その場のノリ・
// 人間の判断に完全に委ねる(アプリ側は罰の内容を一切指定しない)。
const JUDGE_CHANCE = 0.35; // 35%

/* ---------------- 表彰式の間隔 ---------------- */
const CEREMONY_INTERVAL = 10; // 10ラウンドごとに表彰式

/* ---------------- 🎁 無料版のグロース導線：規定回数遊んだら24時間お試しを案内 ---------------- */
// referral.jsの「友達紹介24時間特典」と同じ仕組みを、規定ラウンド数プレイという
// 別の条件からも起動する（表示は端末につき1回だけ。無料で遊べる範囲は一切減らさない）
const FREE_TRIAL_OFFER_ROUND = 5;
const TRIAL_OFFER_SHOWN_KEY = "batsu-trial-offer-shown";

function maybeQueueTrialOffer() {
  if (isPremiumUnlocked()) return;
  if (state.roundCount < FREE_TRIAL_OFFER_ROUND) return;
  try {
    if (localStorage.getItem(TRIAL_OFFER_SHOWN_KEY)) return;
  } catch (e) {}
  state.pendingTrialOffer = true;
}

/* ---------------- 言語の切り替え順番 ---------------- */
const LANG_CYCLE = ["ja", "en", "zh", "ko", "es", "pt", "vi", "de", "tl", "fr", "th", "id"];
const LANG_LABELS = { ja: "日", en: "EN", zh: "中", ko: "한", es: "ES", pt: "PT", vi: "VI", de: "DE", tl: "TL", fr: "FR", th: "TH", id: "ID" };

// ブラウザ・OSの言語設定から、対応言語を自動判定する（初回訪問・言語未選択のときだけ使う）
function detectBrowserLang() {
  const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
  for (const raw of langs) {
    const code = (raw || "").toLowerCase();
    for (const lang of LANG_CYCLE) {
      if (code.startsWith(lang)) return lang;
    }
  }
  return "en"; // 対応外の言語圏からのアクセスは、日本語ではなく国際共通語の英語を既定にする
}

/* ---------------- 🎨 テーマの切り替え順番 ---------------- */
const THEME_CYCLE = ["neon", "casino", "izakaya"];
const THEME_EMOJI = { neon: "🌃", casino: "🎰", izakaya: "🏮" };

/* ---------------- 🃏 イカサマモードの当選率 ---------------- */
const RIG_BOOST = 0.7; // 仕込んだ人が当たる確率（70%）

/* ---------------- 💎 有料版の解放判定 ----------------
   Billing（billing.js）が、Stripe決済リンクからの復帰または
   開発確認用の ?premium=1 を見て判定する。
   ------------------------------------------------------ */
function isPremiumUnlocked() {
  return typeof Billing !== "undefined" && Billing.isPremium();
}

// 🍶 ひとり飲みモード＋飲み友AI専用の月額サブスク（通常プレミアムとは別枠）
function isSoloPremiumUnlocked() {
  return typeof SoloBilling !== "undefined" && SoloBilling.isPremium();
}

/* ---------------- 状態（ゲームの記憶） ---------------- */
const state = {
  lang: "ja",          // "ja"日本語 / "en"英語 / "zh"繁體中文 / "ko"한국어 / "es"español
  mode: "mf",          // "mf" = 男女に分ける / "all" = 全員一緒
  men: [],
  women: [],
  everyone: [],
  currentSpeech: null, // 「もう一度読み上げ」用
  currentPair: null,   // パス用（同じ2人でお題だけ変える）
  currentOdaiPack: null, // パス用（👑王様ゲームモードの「エッチなお題」等、state.packと異なるパックでお題を出した場合に記憶）
  currentKing: null,   // パス用（王様はそのまま、対象者だけ選び直す）
  currentKingTargets: null, // 🔞大人向けパック／👑王様ゲームモードの王様の対象者(配列)。標準パックの王様はnull(パス不可)
  currentKingShowReminder: false, // パス用（👑王様ゲームモードの安全ガイド表示を、対象者を選び直した後も維持する）
  isKing: false,
  voicePersona: "random", // 声のキャラクター（random / mc / oyaji / girl）
  currentVoice: null,     // 今回の読み上げに使った声（もう一度読み上げ用）
  roundCount: 0,       // これまでに終わったラウンド数（表彰の判定に使う）
  roundsSinceKing: 0,  // 王様不成立が連続した回数（当選率の底上げ判定用）
  stats: {},           // 名前 -> { king: 王様になった回数, challenge: お題をやった回数 }
  pendingCeremony: false, // 次の「次のルーレットへ」で表彰画面を挟むかどうか
  pendingTrialOffer: false, // 次の「次のルーレットへ」で24時間お試し案内を挟むかどうか
  theme: "neon",       // "neon" / "casino" / "izakaya"（🎨着せ替え・有料機能）
  riggedName: null,    // 🃏イカサマモードで仕込んだ名前（次の1回だけ有効）
  hypeEnabled: false,  // 🔊盛り上がりメーター（マイク音量連動、有効時のみゲーム画面でマイクを起動）
  pack: "standard",    // "standard" / "romance"（💌恋愛パック・有料機能）
  onlineRole: null,    // null / "host" / "guest"（📡オンラインモード・有料機能）
  onlineCode: null,    // オンラインモードの部屋コード
};

/* ---------------- 🎵 BGMジャンルの切り替え順番 ---------------- */
const BGM_CYCLE = ["jazz", "edm", "enka"];

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

/* 🌐 UI文言集(UI定数、9言語ぶん)は i18n.js に分離済み。
   index.htmlで i18n.js を先に読み込む前提のグローバル参照。
   （2026-08-11、odai-generator.jsと合わせてファイルを軽量化） */

function t(key) {
  const value = UI[state.lang][key];
  // 新しい機能の文言は、まだ日本語・英語にしか用意していないものがある。
  // 未対応の言語では日本語にフォールバックする（undefinedの表示を防ぐため）
  return value !== undefined ? value : UI.ja[key];
}

/* ---------------- 言語の適用 ---------------- */
function applyLanguage() {
  const u = UI[state.lang];
  document.documentElement.lang = state.lang;

  document.getElementById("t-sub").textContent = u.sub;
  document.getElementById("t-logo").innerHTML = u.logoHTML;
  document.getElementById("t-tag").textContent = u.tag;
  document.getElementById("t-free").textContent = u.free;
  document.getElementById("btn-start").textContent = u.start;
  document.getElementById("t-premium-heading").textContent = u.premiumHeading;
  document.getElementById("pack-adult").innerHTML = `${u.packs.adult} <span class="lock">🔒</span>`;
  document.getElementById("pack-family").innerHTML = `${u.packs.family} <span class="lock">🔒</span>`;
  document.getElementById("pack-couple").innerHTML = `${u.packs.couple} <span class="lock">🔒</span>`;
  document.getElementById("pack-romance").innerHTML = `${u.packs.romance} <span class="lock">🔒</span>`;
  document.getElementById("pack-online").innerHTML = `${u.packs.online} <span class="lock">🔒</span>`;
  document.getElementById("pack-nerutoon").innerHTML = `${u.packs.nerutoon} <span class="lock">🔒</span>`;
  document.getElementById("pack-party").innerHTML = `${u.packs.party} <span class="lock">🔒</span>`;
  document.getElementById("pack-noalcohol").textContent = u.packs.noalcohol;
  document.getElementById("pack-solo").innerHTML = `${u.packs.solo} <span class="lock">🔒</span>`;
  // 😈タゴサクAIは🍶ひとり飲みモードの中だけで使える機能として統合済み（旧・独立パックボタンは廃止）。
  // ボタン自体は startRound() 側で state.pack==="solo" && state.lang==="ja" のときだけ表示する
  document.getElementById("btn-roast-solo").textContent = t("roastSoloBtn");
  document.getElementById("pack-kinggame").textContent = u.packs.kinggame;
  // 👑王様ゲームモードは「その場の人が罰を即興で考える」仕組みのため、外国人ゲスト等
  // 文化的な地雷（宗教・パーソナルスペース感覚など）が分からない相手には向かない。
  // スマホの言語設定が日本語以外（＝海外ゲストの可能性が高い）のときは、同じQRコード・
  // 同じリンクのままボタン自体を隠し、安全な通常パックだけを見せる。
  const kingGameAllowed = state.lang === "ja";
  document.getElementById("pack-kinggame").classList.toggle("hidden", !kingGameAllowed);
  // 日本語が読めないゲストにスマホを渡す場面(1台のスマホを回して遊ぶスタイルのため)を
  // 想定し、ボタンの直下にも英語混じりで「日本語話者向け」の注意書きを表示しておく。
  document.getElementById("t-kinggame-notice").classList.toggle("hidden", !kingGameAllowed);
  if (!kingGameAllowed && state.pack === "kinggame") {
    state.pack = "standard";
    document.getElementById("pack-kinggame").classList.remove("active-pack");
    try { localStorage.removeItem(PACK_STORAGE_KEY); } catch (e) {}
  }
  document.getElementById("t-notice").innerHTML = u.noticeHTML;
  document.getElementById("t-viral-footer").textContent = u.viralFooter;

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

  document.getElementById("t-spice-label").textContent = u.spiceLabel;
  document.getElementById("t-bilingual-label").textContent = u.bilingualLabel;
  document.getElementById("btn-spin").textContent = u.spinBtn;
  document.getElementById("btn-speak").textContent = u.speak;
  document.getElementById("btn-pass").textContent = u.pass;
  document.getElementById("btn-share").textContent = u.share;
  document.getElementById("btn-share-x").textContent = u.shareOnX;
  document.getElementById("btn-next").textContent = u.next;
  document.getElementById("btn-ceremony-continue").textContent = u.ceremonyContinue;

  document.getElementById("t-modal-title").textContent = u.modalTitle;
  document.getElementById("t-modal-price").textContent = u.modalPrice;
  document.getElementById("modal-close").textContent = u.modalClose;
  document.getElementById("t-unlocked-title").textContent = u.unlockedTitle;
  document.getElementById("t-unlocked-desc").textContent = u.unlockedDesc;
  document.getElementById("unlocked-close").textContent = u.unlockedClose;

  document.getElementById("t-online-title").textContent = u.onlineTitle;
  document.getElementById("t-online-desc").textContent = u.onlineDesc;
  document.getElementById("online-create").textContent = u.onlineCreateBtn;
  document.getElementById("online-code-input").placeholder = u.onlineJoinPlaceholder;
  document.getElementById("online-join").textContent = u.onlineJoinBtn;
  document.getElementById("online-close").textContent = u.onlineClose;
  document.getElementById("t-online-guest-title").textContent = u.onlineGuestTitle;
  document.getElementById("btn-online-leave").textContent = u.onlineLeave;

  document.getElementById("t-ach-title").textContent = u.achTitle;
  document.getElementById("achievements-close").textContent = u.achClose;
  document.getElementById("t-help-title").textContent = u.helpTitle;
  document.getElementById("help-close").textContent = u.helpClose;
  document.getElementById("t-hl-title").textContent = u.hlTitle;
  document.getElementById("highlights-close").textContent = u.hlClose;

  document.getElementById("t-sub-title").textContent = u.subTitle;
  document.getElementById("t-sub-desc").textContent = u.subDesc;
  document.getElementById("submission-input").placeholder = u.subPlaceholder;
  document.getElementById("submission-post").textContent = u.subPostBtn;
  document.getElementById("t-sub-list-title").textContent = u.subListTitle;
  document.getElementById("submissions-close").textContent = u.subClose;

  updateLangButton();
  updateBgmGenreButton();
  updateSetupUiForPack();
}

/* ---------------- 🌐 言語ボタン（どの画面からでも切り替え可能） ---------------- */
const btnLang = document.getElementById("btn-lang");

function updateLangButton() {
  btnLang.textContent = LANG_LABELS[state.lang];
}

btnLang.addEventListener("click", () => {
  const i = LANG_CYCLE.indexOf(state.lang);
  state.lang = LANG_CYCLE[(i + 1) % LANG_CYCLE.length];
  try { localStorage.setItem("batsu-lang", state.lang); } catch (e) {}
  applyLanguage();
  showToast(`🌐 ${UI[state.lang].langName}`);
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
  ceremony: document.getElementById("screen-ceremony"),
  onlineGuest: document.getElementById("screen-online-guest"),
};

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.add("hidden"));
  screens[name].classList.remove("hidden");
  window.scrollTo(0, 0);
  if (name === "setup") updateSetupUiForPack();
  // 🔊盛り上がりメーター：ゲーム画面にいる間だけマイクを起動し、離れたら必ず止める（プライバシー配慮）
  if (typeof HypeMeter !== "undefined") {
    if (name === "game" && state.hypeEnabled) {
      HypeMeter.start();
    } else {
      HypeMeter.stop();
      stopHypeChallenge();
    }
  }
}

/* =========================================================
   タイトル画面
   ========================================================= */
document.getElementById("btn-start").addEventListener("click", () => {
  unlockSpeech(); // ゲームの一番最初のタップで読み上げ機能を起こしておく
  showScreen("setup");
  updateFamilyRoleRowVisibility();
});

// 有料版（ロック中）ボタン → ご案内モーダル
const modal = document.getElementById("modal-premium");
const modalUpgradeBtn = document.getElementById("modal-upgrade");

// アップグレードボタンを押したときにどのプランの決済リンクを開くか
// （通常はBilling。🍶ひとり飲み系の案内のときだけSoloBillingに切り替える）
let modalActiveBilling = Billing;

// 有料版ご案内モーダルを、アップグレードボタン付きで表示する
function showPremiumModal(text, billingModule) {
  document.getElementById("modal-text").textContent = text;
  modalUpgradeBtn.textContent = t("upgradeBtn");
  modalUpgradeBtn.classList.remove("hidden");
  modal.classList.remove("hidden");
  modalActiveBilling = billingModule || Billing;
}

document.querySelectorAll(".btn-locked").forEach((btn) => {
  // 個別に専用ハンドラを持つパックは、ここでは何もしない（二重発火防止。以前は
  // family/couple/party/nerutoon/soloがこの除外リストから漏れており、専用ハンドラが
  // あるにも関わらずクリックのたびに常に「ご案内モーダル」が出てしまうバグがあった）
  if (["romance", "online", "adult", "family", "couple", "party", "nerutoon", "solo"].includes(btn.dataset.pack)) return;
  btn.addEventListener("click", () => {
    showPremiumModal(t("packTeaser")(UI[state.lang].packs[btn.dataset.pack]));
  });
});
document.getElementById("modal-close").addEventListener("click", () => {
  modal.classList.add("hidden");
});
modalUpgradeBtn.addEventListener("click", () => {
  const opened = modalActiveBilling.openCheckout();
  if (!opened) showToast(t("upgradeNotConfigured"));
});

// 有料機能をブロックして案内モーダルを出す（未解放のときだけ true を返す）
function blockIfNotPremium(packKey) {
  if (isPremiumUnlocked()) return false;
  showPremiumModal(t("packTeaser")(UI[state.lang].packs[packKey]));
  return true;
}

// 🍶 ひとり飲みモード＋飲み友AI専用のブロック判定（通常プレミアムとは別のSoloBillingを見る）
function blockIfNotSoloPremium(packKey) {
  if (isSoloPremiumUnlocked()) return false;
  showPremiumModal(t("packTeaser")(UI[state.lang].packs[packKey]), SoloBilling);
  return true;
}

/* ---------------- 💎 決済成功後：プレミアム解放のお祝い演出 ---------------- */
const modalUnlocked = document.getElementById("modal-unlocked");

function showPremiumUnlockedCelebration() {
  document.getElementById("t-unlocked-title").textContent = t("unlockedTitle");
  document.getElementById("t-unlocked-desc").textContent = t("unlockedDesc");
  document.getElementById("unlocked-close").textContent = t("unlockedClose");
  modalUnlocked.classList.remove("hidden");
  celebrate(["#ffe14b", "#ffb52d", "#ffffff"], [100, 50, 100, 50, 200]);
  SFX.kingFanfare();
}
document.getElementById("unlocked-close").addEventListener("click", () => {
  modalUnlocked.classList.add("hidden");
});

/* ---------------- 🎨 テーマ着せ替えボタン（有料機能） ---------------- */
const btnTheme = document.getElementById("btn-theme");

// テーマの色は毎フレーム取得すると重いので、切り替え時だけ計算してキャッシュする
let cachedThemeColors = { a: "#ff2d95", b: "#8f4bff" };
function updateCachedThemeColors() {
  const style = getComputedStyle(document.body);
  cachedThemeColors = {
    a: style.getPropertyValue("--c-accent-a").trim() || "#ff2d95",
    b: style.getPropertyValue("--c-accent-b").trim() || "#8f4bff",
  };
  if (typeof Swarm !== "undefined" && Swarm.readThemeColors) Swarm.readThemeColors();
}

function applyTheme() {
  document.body.classList.remove(...THEME_CYCLE.map((th) => `theme-${th}`));
  if (state.theme !== "neon") document.body.classList.add(`theme-${state.theme}`);
  btnTheme.textContent = THEME_EMOJI[state.theme];
  updateCachedThemeColors();
  drawWheel();
}

btnTheme.addEventListener("click", () => {
  if (blockIfNotPremium("theme")) return;
  const i = THEME_CYCLE.indexOf(state.theme);
  state.theme = THEME_CYCLE[(i + 1) % THEME_CYCLE.length];
  try { localStorage.setItem("batsu-theme", state.theme); } catch (e) {}
  applyTheme();
  showToast(t("themes")[state.theme]);
});

/* ---------------- 🔊 盛り上がりメーター（マイク音量連動・無料機能） ----------------
   マイクの音量に応じたゲージを表示し、盛り上がったらボーナス演出。
   声が足りなくても一切ペナルティは無い（罰の強制はしない、という設計方針を守るため） */
const btnHype = document.getElementById("btn-hype");

btnHype.addEventListener("click", async () => {
  const turningOn = !state.hypeEnabled;
  if (turningOn) {
    if (!HypeMeter.isSupported()) {
      showToast(t("hypeUnsupported"));
      return;
    }
    const ok = await HypeMeter.start();
    if (!ok) {
      showToast(t("hypeMicDenied"));
      return;
    }
  } else {
    HypeMeter.stop();
    stopHypeChallenge();
  }
  state.hypeEnabled = turningOn;
  btnHype.classList.toggle("active", turningOn);
  try { localStorage.setItem("batsu-hype-enabled", turningOn ? "1" : "0"); } catch (e) {}
  showToast(t(turningOn ? "hypeOn" : "hypeOff"));
});

const HYPE_CHALLENGE_DURATION = 8000; // 8秒以内に盛り上げられるか
const HYPE_THRESHOLD = 62; // 0〜100の目安値のうち、これを超えたら成功（体感で調整可能）
let hypeChallengeActive = false;
let hypeChallengeFrame = null;

function startHypeChallenge() {
  if (!state.hypeEnabled || !HypeMeter.isRunning()) return;
  stopHypeChallenge(); // 前回分の後片付け

  const panel = document.getElementById("hype-panel");
  const fill = document.getElementById("hype-bar-fill");
  const label = document.getElementById("hype-label");
  const timerEl = document.getElementById("hype-timer");

  panel.classList.remove("hidden", "hype-success", "hype-fail");
  label.textContent = t("hypeChallenge");
  hypeChallengeActive = true;
  const startTime = performance.now();

  function frame(now) {
    if (!hypeChallengeActive) return;
    const level = HypeMeter.getLevel();
    fill.style.width = level + "%";
    const elapsed = now - startTime;
    const remaining = Math.max(0, HYPE_CHALLENGE_DURATION - elapsed);
    timerEl.textContent = (remaining / 1000).toFixed(1) + "s";

    if (level >= HYPE_THRESHOLD) {
      hypeChallengeActive = false;
      panel.classList.add("hype-success");
      label.textContent = t("hypeSuccess");
      celebrate(["#ffe14b", "#2de2ff", "#ffffff"], 60);
      SFX.reveal();
      setTimeout(() => panel.classList.add("hidden"), 1800);
      return;
    }
    if (elapsed >= HYPE_CHALLENGE_DURATION) {
      hypeChallengeActive = false;
      // 声が足りなくても、ここでは何も罰は与えない。コミカルな「不発」演出だけ
      panel.classList.add("hype-fail");
      label.textContent = t("hypeFail");
      setTimeout(() => panel.classList.add("hidden"), 1800);
      return;
    }
    hypeChallengeFrame = requestAnimationFrame(frame);
  }
  hypeChallengeFrame = requestAnimationFrame(frame);
}

function stopHypeChallenge() {
  hypeChallengeActive = false;
  if (hypeChallengeFrame) cancelAnimationFrame(hypeChallengeFrame);
  hypeChallengeFrame = null;
  const panel = document.getElementById("hype-panel");
  if (panel) panel.classList.add("hidden");
}

/* ---------------- 🃏 イカサマモード（幹事専用・有料機能） ---------------- */
const btnRig = document.getElementById("btn-rig");
const modalRig = document.getElementById("modal-rig");

btnRig.addEventListener("click", () => {
  if (blockIfNotPremium("rig")) return;
  document.getElementById("t-rig-title").textContent = t("rigTitle");
  document.getElementById("t-rig-desc").textContent = t("rigDesc");
  document.getElementById("rig-clear").textContent = t("rigClear");

  const list = document.getElementById("rig-list");
  list.innerHTML = "";
  participants().forEach((p) => {
    const b = document.createElement("button");
    b.className = "btn rig-name-btn" + (state.riggedName === p.name ? " selected" : "");
    b.textContent = p.name;
    b.addEventListener("click", () => {
      state.riggedName = p.name;
      modalRig.classList.add("hidden");
      btnRig.classList.add("active");
      showToast(t("rigSet")(p.name));
      Achievements.bump("totalRigs");
    });
    list.appendChild(b);
  });

  modalRig.classList.remove("hidden");
});

document.getElementById("rig-clear").addEventListener("click", () => {
  state.riggedName = null;
  btnRig.classList.remove("active");
  modalRig.classList.add("hidden");
  showToast(t("rigOff"));
});
document.getElementById("rig-close").addEventListener("click", () => {
  modalRig.classList.add("hidden");
});

/* ---------------- 🎵 BGMジャンル切り替えボタン ---------------- */
const btnBgmGenre = document.getElementById("btn-bgm-genre");

function updateBgmGenreButton() {
  btnBgmGenre.textContent = BGM_GENRE_EMOJI[BGM.genre];
}

btnBgmGenre.addEventListener("click", () => {
  const i = BGM_CYCLE.indexOf(BGM.genre);
  const next = BGM_CYCLE[(i + 1) % BGM_CYCLE.length];
  BGM.setGenre(next);
  updateBgmGenreButton();
  showToast(t("bgmGenres")[next]);
});

/* ---------------- パック切り替え共通ヘルパー ----------------
   以前は「切り替え先以外の全ボタンからactive-packを外す」処理をハンドラごとに
   手作業でリストしており、新しいパックを追加するたびに他の全ハンドラを
   更新し忘れるリスクがあった（実際にfamily/couple/partyがこれで見落とされ、
   ボタンを押しても何も起きない不具合になっていた）。今後はここに1回登録すれば
   全ハンドラに反映されるようにする。
   ---------------------------------------------------------- */
const PACK_TOGGLE_BUTTONS = [];

function clearOtherPackButtons(exceptBtn) {
  PACK_TOGGLE_BUTTONS.forEach((b) => {
    if (b !== exceptBtn) b.classList.remove("active-pack");
  });
}

// シンプルな「オン/オフをトグルするだけ」のパック用の共通セットアップ
// （王様ゲーム・大人向けのように専用フローを持つものは対象外）
function setupSimplePackToggle(btn, packKey, onKey, offKey, requiresPremium, blockFn) {
  PACK_TOGGLE_BUTTONS.push(btn);
  const block = blockFn || blockIfNotPremium;
  btn.addEventListener("click", () => {
    if (requiresPremium && block(packKey)) return;
    const turningOn = state.pack !== packKey;
    clearOtherPackButtons(btn);
    state.pack = turningOn ? packKey : "standard";
    btn.classList.toggle("active-pack", turningOn);
    try { localStorage.removeItem(PACK_STORAGE_KEY); } catch (e) {}
    showToast(t(turningOn ? onKey : offKey));
  });
}

/* ---------------- 💌 恋愛パック切り替え（有料機能） ---------------- */
const btnRomance = document.getElementById("pack-romance");
const btnAdult = document.getElementById("pack-adult");
PACK_TOGGLE_BUTTONS.push(btnRomance);

btnRomance.addEventListener("click", () => {
  if (blockIfNotPremium("romance")) return;
  const turningOn = state.pack !== "romance";
  clearOtherPackButtons(btnRomance);
  state.pack = turningOn ? "romance" : "standard";
  btnRomance.classList.toggle("active-pack", turningOn);
  try { localStorage.removeItem(PACK_STORAGE_KEY); } catch (e) {}
  showToast(turningOn ? t("romanceOn") : t("romanceOff"));
});

/* ---------------- 🔞 大人向けパック切り替え（有料機能・年齢確認つき） ---------------- */
const modalAgeGate = document.getElementById("modal-agegate");
PACK_TOGGLE_BUTTONS.push(btnAdult);

btnAdult.addEventListener("click", () => {
  if (blockIfNotPremium("adult")) return;
  if (state.pack === "adult") {
    state.pack = "standard";
    btnAdult.classList.remove("active-pack");
    showToast(t("adultOff"));
    return;
  }
  document.getElementById("t-agegate-title").textContent = t("agegateTitle");
  document.getElementById("t-agegate-desc").textContent = t("agegateDesc");
  document.getElementById("agegate-yes").textContent = t("agegateYes");
  document.getElementById("agegate-no").textContent = t("agegateNo");
  modalAgeGate.classList.remove("hidden");
});

document.getElementById("agegate-yes").addEventListener("click", () => {
  modalAgeGate.classList.add("hidden");
  state.pack = "adult";
  clearOtherPackButtons(btnAdult);
  try { localStorage.removeItem(PACK_STORAGE_KEY); } catch (e) {}
  btnAdult.classList.add("active-pack");
  showToast(t("adultOn"));
});
document.getElementById("agegate-no").addEventListener("click", () => {
  modalAgeGate.classList.add("hidden");
});

/* ---------------- 💘 ねるとんZoomモード切り替え（有料機能） ---------------- */
const btnNerutoon = document.getElementById("pack-nerutoon");
setupSimplePackToggle(btnNerutoon, "nerutoon", "nerutoonOn", "nerutoonOff", true);

/* ---------------- 👨‍👩‍👧 ファミリー向けパック切り替え（有料機能） ---------------- */
const btnFamily = document.getElementById("pack-family");
setupSimplePackToggle(btnFamily, "family", "familyOn", "familyOff", true);

/* ---------------- 💑 1対1モード切り替え（有料機能） ---------------- */
const btnCouple = document.getElementById("pack-couple");
setupSimplePackToggle(btnCouple, "couple", "coupleOn", "coupleOff", true);

/* ---------------- 🎉 法人・パーティープラン切り替え（有料機能） ---------------- */
const btnParty = document.getElementById("pack-party");
setupSimplePackToggle(btnParty, "party", "partyOn", "partyOff", true);

/* ---------------- 🥤 ノンアルコール版パック（無料・プレミアム判定なし） ---------------- */
const btnNoAlcohol = document.getElementById("pack-noalcohol");
setupSimplePackToggle(btnNoAlcohol, "noalcohol", "noalcoholOn", "noalcoholOff", false);

/* ---------------- 🍶 ひとり飲みモード（月額サブスク・SoloBilling） ---------------- */
const btnSolo = document.getElementById("pack-solo");
setupSimplePackToggle(btnSolo, "solo", "soloOn", "soloOff", true, blockIfNotSoloPremium);
// 🍶ひとり飲みモードのON/OFFに合わせて、名前入力欄の見た目（1人向け表記・モード切替の非表示）を更新する
btnSolo.addEventListener("click", () => updateSetupUiForPack());

/* ---------------- 👑 王様ゲームモード（無料・QR配布などから即遊べる王様ゲーム特化モード） ---------------- */
// プレミアム未解放: 王様50% / 王様×自動ランダム指名30% / 通常ネタ20%
// プレミアム解放後: 王様60% / 残り40%はエッチなお題（ラウンド進行はrunKingGameRound()）
const btnKingGame = document.getElementById("pack-kinggame");
PACK_TOGGLE_BUTTONS.push(btnKingGame);
const modalKingGameDisclaimer = document.getElementById("modal-kinggame-disclaimer");
const KINGGAME_DISCLAIMER_KEY = "batsu-kinggame-disclaimer-seen";
// 王様ゲームモードは「ページを開き直すたびに選び直す」のを忘れがちで、
// うっかり通常パックのまま遊んでしまう不具合報告があったため、選択状態を
// 他の言語/声/テーマ同様localStorageに覚えさせ、次回訪問時も自動で復元する。
const PACK_STORAGE_KEY = "batsu-pack";

function activateKingGameMode() {
  state.pack = "kinggame";
  clearOtherPackButtons(btnKingGame);
  btnKingGame.classList.add("active-pack");
  try { localStorage.setItem(PACK_STORAGE_KEY, "kinggame"); } catch (e) {}
  showToast(t("kinggameOn"));
}

btnKingGame.addEventListener("click", () => {
  if (state.pack === "kinggame") {
    state.pack = "standard";
    btnKingGame.classList.remove("active-pack");
    try { localStorage.removeItem(PACK_STORAGE_KEY); } catch (e) {}
    showToast(t("kinggameOff"));
    return;
  }

  let seen = false;
  try { seen = localStorage.getItem(KINGGAME_DISCLAIMER_KEY) === "1"; } catch (e) {}
  if (seen) {
    activateKingGameMode();
    return;
  }

  document.getElementById("t-kinggame-disclaimer-title").textContent = t("kinggameDisclaimerTitle");
  document.getElementById("t-kinggame-disclaimer-desc").textContent = t("kinggameDisclaimerDesc");
  document.getElementById("kinggame-disclaimer-agree").textContent = t("kinggameDisclaimerAgree");
  document.getElementById("kinggame-disclaimer-cancel").textContent = t("kinggameDisclaimerCancel");
  modalKingGameDisclaimer.classList.remove("hidden");
});

document.getElementById("kinggame-disclaimer-agree").addEventListener("click", () => {
  try { localStorage.setItem(KINGGAME_DISCLAIMER_KEY, "1"); } catch (e) {}
  modalKingGameDisclaimer.classList.add("hidden");
  activateKingGameMode();
});
document.getElementById("kinggame-disclaimer-cancel").addEventListener("click", () => {
  modalKingGameDisclaimer.classList.add("hidden");
});

/* ---------------- 🌶️ お色気レベルスライダー（有料機能：レベル3以上） ---------------- */
const spiceSlider = document.getElementById("spice-slider");
const spiceValueEl = document.getElementById("spice-value");
const SPICE_TO_PACK = { 1: "standard", 2: "standard", 3: "romance", 4: "adult", 5: "adult" };
const FREE_SPICE_LEVEL = 2;

function applySpiceLevel(level) {
  spiceValueEl.textContent = `Lv.${level}`;
  state.pack = SPICE_TO_PACK[level] || "standard";
  clearOtherPackButtons(null);
  btnRomance.classList.toggle("active-pack", state.pack === "romance");
  btnAdult.classList.toggle("active-pack", state.pack === "adult");
  try { localStorage.removeItem(PACK_STORAGE_KEY); } catch (e) {}
}

spiceSlider.addEventListener("input", () => {
  const level = Number(spiceSlider.value);
  if (level > FREE_SPICE_LEVEL && !isPremiumUnlocked()) {
    spiceSlider.value = FREE_SPICE_LEVEL;
    showPremiumModal(t("spiceLocked"));
    applySpiceLevel(FREE_SPICE_LEVEL);
    return;
  }
  applySpiceLevel(level);
  showToast(`🌶️ Lv.${level}`);
});

/* ---------------- 🏆 実績バッジ ---------------- */
const modalAchievements = document.getElementById("modal-achievements");

function renderAchievements() {
  const grid = document.getElementById("achievements-grid");
  const stats = Achievements.get();
  const names = ACHIEVEMENT_NAMES[state.lang] || ACHIEVEMENT_NAMES.ja;
  grid.innerHTML = "";
  Achievements.list.forEach((a) => {
    const unlocked = stats.unlocked.includes(a.id);
    const box = document.createElement("div");
    box.className = "achievement-badge" + (unlocked ? " unlocked" : "");
    box.innerHTML = `<span class="emoji">${a.emoji}</span><span class="name">${names[a.id]}</span>`;
    grid.appendChild(box);
  });
}

document.getElementById("btn-achievements").addEventListener("click", () => {
  renderAchievements();
  modalAchievements.classList.remove("hidden");
});
document.getElementById("achievements-close").addEventListener("click", () => {
  modalAchievements.classList.add("hidden");
});

/* ---------------- ❓ アイコンの説明モーダル ----------------
   画面上部に並ぶ、文字ラベルのない小さいアイコンボタン群が
   「何のボタンか分かりにくい」というご要望から追加。
   HELP_ICONSの並び順は、UI[lang].helpItems（game.js内、各言語の
   achUnlocked直後）の並び順と1対1で対応させること。 */
const modalHelp = document.getElementById("modal-help");
const HELP_ICONS = ["🎷", "🎷", "🎲", "🌐", "🎨", "🔊", "📸", "🏆", "📮", "📤", "X", "💬", "✈️", "📷", "💚", "🎬", "🚀", "🔗"];

function renderHelp() {
  document.getElementById("t-help-title").textContent = t("helpTitle");
  const list = document.getElementById("help-list");
  list.innerHTML = "";
  t("helpItems").forEach((label, i) => {
    const row = document.createElement("div");
    row.className = "help-item";
    row.innerHTML = `<span class="help-icon">${HELP_ICONS[i] || "•"}</span><span class="help-label"></span>`;
    row.querySelector(".help-label").textContent = label;
    list.appendChild(row);
  });
}

document.getElementById("btn-help").addEventListener("click", () => {
  renderHelp();
  modalHelp.classList.remove("hidden");
});
document.getElementById("help-close").addEventListener("click", () => {
  modalHelp.classList.add("hidden");
});

// 新しいバッジが解除された瞬間にトーストで知らせる
Achievements.setUnlockHandler((a) => {
  const names = ACHIEVEMENT_NAMES[state.lang] || ACHIEVEMENT_NAMES.ja;
  showToast(t("achUnlocked")(names[a.id]));
});

/* ---------------- 📸 ハイライトギャラリー ---------------- */
const modalHighlights = document.getElementById("modal-highlights");

function renderHighlights() {
  const grid = document.getElementById("highlights-grid");
  const empty = document.getElementById("hl-empty");
  const items = Highlights.all();
  grid.innerHTML = "";
  empty.textContent = items.length === 0 ? t("hlEmpty") : "";
  items.forEach((item, i) => {
    const a = document.createElement("a");
    a.href = item.dataUrl;
    a.download = `batsu-highlight-${i + 1}.png`;
    a.className = "highlight-item";
    const img = document.createElement("img");
    img.src = item.dataUrl;
    a.appendChild(img);
    grid.appendChild(a);
  });
}

document.getElementById("btn-highlights").addEventListener("click", () => {
  renderHighlights();
  modalHighlights.classList.remove("hidden");
});
document.getElementById("highlights-close").addEventListener("click", () => {
  modalHighlights.classList.add("hidden");
});

/* ---------------- 📮 罰ゲーム投稿・共有（有料機能） ---------------- */
const modalSubmissions = document.getElementById("modal-submissions");
const btnSubmissions = document.getElementById("btn-submissions");
const submissionList = document.getElementById("submission-list");
const submissionEmpty = document.getElementById("submission-empty");
let submissionsWatching = false;

function renderSubmissionList(items) {
  submissionList.innerHTML = "";
  submissionEmpty.textContent = items.length === 0 ? t("subEmpty") : "";
  items.forEach((item) => {
    const box = document.createElement("div");
    box.className = "submission-item";

    const p = document.createElement("p");
    p.textContent = item.text;
    box.appendChild(p);

    const langTag = document.createElement("span");
    langTag.className = "submission-lang";
    langTag.textContent = (item.lang || "ja").toUpperCase();
    box.appendChild(langTag);

    const actions = document.createElement("div");
    actions.className = "submission-actions";

    const speakBtn = document.createElement("button");
    speakBtn.className = "btn btn-sub";
    speakBtn.textContent = t("subSpeak");
    speakBtn.addEventListener("click", () => {
      speakOdai(item.text, item.lang || state.lang, resolveVoice());
    });

    const reportBtn = document.createElement("button");
    reportBtn.className = "btn btn-ghost";
    reportBtn.textContent = t("subReport");
    reportBtn.addEventListener("click", () => {
      Submissions.report(item.id);
      showToast(t("subReported"));
    });

    actions.appendChild(speakBtn);
    actions.appendChild(reportBtn);
    box.appendChild(actions);
    submissionList.appendChild(box);
  });
}

btnSubmissions.addEventListener("click", () => {
  if (blockIfNotPremium("post")) return;
  document.getElementById("submission-message").textContent = "";
  document.getElementById("submission-input").value = "";
  modalSubmissions.classList.remove("hidden");

  if (!Submissions.isConfigured()) {
    submissionEmpty.textContent = t("subNotConfigured");
    submissionList.innerHTML = "";
    return;
  }
  if (!submissionsWatching) {
    submissionsWatching = true;
    Submissions.watchApproved(renderSubmissionList);
  }
});

document.getElementById("submissions-close").addEventListener("click", () => {
  modalSubmissions.classList.add("hidden");
});

document.getElementById("submission-post").addEventListener("click", () => {
  const input = document.getElementById("submission-input");
  const msg = document.getElementById("submission-message");
  const text = input.value.trim();

  if (!Submissions.isConfigured()) {
    msg.textContent = t("subNotConfigured");
    return;
  }
  if (!text) {
    msg.textContent = t("subRejectedEmpty");
    return;
  }
  if (text.length > Moderation.MAX_LENGTH) {
    msg.textContent = t("subRejectedTooLong");
    return;
  }

  const result = Submissions.submit(text, state.lang);
  if (!result.ok) {
    msg.textContent = result.reason === "ng_word" ? t("subRejectedNgWord") : t("subNotConfigured");
    return;
  }
  input.value = "";
  msg.textContent = t("subPostedPending");
});

/* ---------------- 🛡️ 管理者用：承認待ちの投稿（?admin=1でのみ表示） ---------------- */
const isAdminView = new URLSearchParams(location.search).get("admin") === "1";
if (isAdminView) {
  const btnAdmin = document.createElement("button");
  btnAdmin.id = "btn-admin";
  btnAdmin.className = "btn-float";
  btnAdmin.title = "Admin";
  btnAdmin.textContent = "🛡️";
  document.querySelector(".floating-controls").appendChild(btnAdmin);

  const modalAdmin = document.getElementById("modal-admin");
  const adminList = document.getElementById("admin-list");
  const adminEmpty = document.getElementById("admin-empty");
  let adminWatching = false;

  const renderAdminList = (items) => {
    adminList.innerHTML = "";
    adminEmpty.textContent = items.length === 0 ? t("adminEmpty") : "";
    items.forEach((item) => {
      const box = document.createElement("div");
      box.className = "submission-item";

      const p = document.createElement("p");
      p.textContent = `[${(item.lang || "ja").toUpperCase()}] ${item.text}`;
      box.appendChild(p);

      const actions = document.createElement("div");
      actions.className = "submission-actions";

      const approveBtn = document.createElement("button");
      approveBtn.className = "btn btn-primary";
      approveBtn.textContent = t("adminApprove");
      approveBtn.addEventListener("click", () => Submissions.moderate(item.id, true));

      const rejectBtn = document.createElement("button");
      rejectBtn.className = "btn btn-ghost";
      rejectBtn.textContent = t("adminReject");
      rejectBtn.addEventListener("click", () => Submissions.moderate(item.id, false));

      actions.appendChild(approveBtn);
      actions.appendChild(rejectBtn);
      box.appendChild(actions);
      adminList.appendChild(box);
    });
  };

  btnAdmin.addEventListener("click", () => {
    modalAdmin.classList.remove("hidden");
    if (!Submissions.isConfigured()) {
      adminEmpty.textContent = t("subNotConfigured");
      return;
    }
    if (!adminWatching) {
      adminWatching = true;
      Submissions.watchPending(renderAdminList);
    }
  });
  document.getElementById("admin-close").addEventListener("click", () => {
    modalAdmin.classList.add("hidden");
  });
}

/* ---------------- 📡 オンライン飲み会モード（有料機能） ---------------- */
const modalOnline = document.getElementById("modal-online");
const onlineHostBadge = document.getElementById("online-host-badge");

document.getElementById("pack-online").addEventListener("click", () => {
  if (blockIfNotPremium("online")) return;
  document.getElementById("online-message").textContent = "";
  document.getElementById("online-code-input").value = "";
  modalOnline.classList.remove("hidden");
});

document.getElementById("online-close").addEventListener("click", () => {
  modalOnline.classList.add("hidden");
});

// 部屋を作る（幹事）
document.getElementById("online-create").addEventListener("click", () => {
  const zoomUrl = document.getElementById("online-zoom-input").value.trim();
  const code = Online.createRoom(zoomUrl);
  if (!code) {
    document.getElementById("online-message").textContent = t("onlineNotConfigured");
    return;
  }
  state.onlineRole = "host";
  state.onlineCode = code;
  document.getElementById("online-message").textContent = t("onlineRoomCreated")(code);
  showToast(t("onlineRoomCreated")(code));
  setTimeout(() => {
    modalOnline.classList.add("hidden");
    showScreen("setup");
  }, 2200);
});

// 部屋に参加する（ゲスト）
document.getElementById("online-join").addEventListener("click", () => {
  unlockSpeech(); // ホストからの読み上げは操作なしで届くため、ここで先に起こしておく
  const code = document.getElementById("online-code-input").value.trim();
  if (!/^\d{4}$/.test(code)) {
    document.getElementById("online-message").textContent = t("onlineInvalidCode");
    return;
  }
  const zoomLink = document.getElementById("online-guest-zoom-link");
  zoomLink.classList.add("hidden");
  const ok = Online.joinRoom(code, handleOnlineResult, (zoomUrl) => {
    if (zoomUrl) {
      zoomLink.href = zoomUrl;
      zoomLink.classList.remove("hidden");
    }
  });
  if (!ok) {
    document.getElementById("online-message").textContent = t("onlineNotConfigured");
    return;
  }
  state.onlineRole = "guest";
  state.onlineCode = code;
  modalOnline.classList.add("hidden");
  document.getElementById("online-guest-code-label").textContent = "";
  document.getElementById("online-guest-status").textContent = t("onlineGuestWaiting")(code);
  document.getElementById("online-guest-card").classList.add("hidden");
  showScreen("onlineGuest");
});

// ホストからの結果を受け取ったとき（ゲスト側）
function handleOnlineResult(data) {
  const card = document.getElementById("online-guest-card");
  card.textContent = data.displayText;
  card.classList.remove("hidden");
  card.classList.toggle("king-card", data.type === "king");
  document.getElementById("online-guest-status").textContent = "";

  const accentA = cachedThemeColors.a;
  const accentB = cachedThemeColors.b;
  if (data.type === "king") {
    celebrate(["#ffe14b", "#ffb52d", "#ffffff"], [100, 50, 100, 50, 200]);
    SFX.kingFanfare();
  } else {
    celebrate([accentA, accentB, "#ffffff"], 80);
    SFX.reveal();
  }
  speakOdai(data.speechText, data.lang || state.lang, resolveVoice());
}

document.getElementById("btn-online-leave").addEventListener("click", () => {
  Online.leave();
  state.onlineRole = null;
  state.onlineCode = null;
  showScreen("title");
});

/* ---------------- 😈 タゴサクAI（有料機能・要Vercelデプロイ） ---------------- */
const modalRoast = document.getElementById("modal-roast");
const roastLog = document.getElementById("roast-log");
const roastInput = document.getElementById("roast-input");
const roastMessage = document.getElementById("roast-message");

function renderRoastTexts() {
  document.getElementById("t-roast-title").textContent = t("roastTitle");
  document.getElementById("t-roast-desc").textContent = t("roastDesc");
  roastInput.placeholder = t("roastPlaceholder");
  document.getElementById("roast-send").textContent = t("roastSend");
}

function appendRoastBubble(text, who) {
  const row = document.createElement("div");
  row.className = "submission-item roast-bubble" + (who === "user" ? " roast-bubble-user" : "");
  row.innerHTML = `<p></p>`;
  row.querySelector("p").textContent = text;
  roastLog.appendChild(row);
  roastLog.scrollTop = roastLog.scrollHeight;
}

// 飲み友AIチャット画面を開く共通処理。forceCharacterを渡すとそのキャラクター固定で開く
// （🍶ひとり飲みモードのキャラクタールーレットで既に決まっている場合など）。省略時はランダム。
function openRoastChat(forceCharacter) {
  renderRoastTexts();
  roastMessage.textContent = "";
  roastLog.innerHTML = "";

  const character = AiRoast.open(forceCharacter);
  document.getElementById("t-roast-title").textContent = `${character.emoji} ${character.name}`;
  document.getElementById("t-roast-desc").textContent = character.tagline;
  appendRoastBubble(character.opener, "ai");
  speakOdai(character.opener, "ja", resolveVoice());

  modalRoast.classList.remove("hidden");
  roastInput.focus();
}

document.getElementById("btn-roast-solo").addEventListener("click", () => {
  if (blockIfNotSoloPremium("roast")) return;
  openRoastChat();
});

document.getElementById("roast-close").addEventListener("click", () => {
  modalRoast.classList.add("hidden");
});

async function sendRoastMessage() {
  const text = roastInput.value.trim();
  if (!text) return;
  roastInput.value = "";
  roastInput.disabled = true;
  document.getElementById("roast-send").disabled = true;
  appendRoastBubble(`【${t("roastYou")}】${text}`, "user");
  roastMessage.textContent = "";

  const result = await AiRoast.send(text);

  if (result.ok) {
    appendRoastBubble(result.reply, "ai");
    speakOdai(result.reply, "ja", resolveVoice());
  } else if (result.reason === "not_configured") {
    roastMessage.textContent = t("roastNotConfigured");
  } else if (result.reason === "quota") {
    roastMessage.textContent = t("roastQuota")(AiRoast.maxTurnsPerDay);
  } else {
    roastMessage.textContent = t("roastError");
  }

  roastInput.disabled = false;
  document.getElementById("roast-send").disabled = false;
  roastInput.focus();
}

document.getElementById("roast-send").addEventListener("click", sendRoastMessage);
roastInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendRoastMessage();
});

// 🎤 音声入力（対応ブラウザのみ・タイプせずに話しかけられるように）
// 誤変換対策として、認識結果は自動送信せず入力欄に入れるだけにする（送るかどうかは本人が確認してから）
(function setupRoastMic() {
  const micBtn = document.getElementById("roast-mic");
  const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!RecognitionCtor) return; // 非対応ブラウザではボタンを出さない（デフォルトhidden済み）
  micBtn.classList.remove("hidden");

  let recognizing = false;
  let recognition = null;

  micBtn.addEventListener("click", () => {
    if (recognizing) {
      recognition.stop();
      return;
    }
    recognition = new RecognitionCtor();
    recognition.lang = "ja-JP";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      recognizing = true;
      micBtn.classList.add("active");
    };
    recognition.onend = () => {
      recognizing = false;
      micBtn.classList.remove("active");
    };
    recognition.onerror = () => {
      recognizing = false;
      micBtn.classList.remove("active");
    };
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      roastInput.value = (roastInput.value ? roastInput.value + " " : "") + text;
      roastInput.focus();
    };
    recognition.start();
  });

  // モーダルを閉じたら、録音中でも一緒に止める
  document.getElementById("roast-close").addEventListener("click", () => {
    if (recognizing) recognition.stop();
  });
})();

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
  updateFamilyRoleRowVisibility();
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

/* ---------------- 👨‍👩‍👧 ファミリーパック専用：役割タグのワンタップ追加 ----------------
   父⇄母／祖父⇄祖母／義父⇄義母 のペアを認識させることで、「馴れ初め」お題
   （showOdai内のtryFamilyMeetStoryOdai()）を発動できるようにする。誰が父で誰が母かを
   アプリに教える手段が他にないため、名前そのものをこの役割ラベルにして参加者リストに
   追加する（例えばボタンを押すと名前欄に「父」が1人分追加される）。
   子供・ゲストは人数がまちまちなため、重複しないよう自動で連番を振る（子供1、子供2…）。
   「全員一緒」モードのみ対応（男女に分けるモードだと役割の性別と得点チームが噛み合わず
   ややこしくなるため、家族向けはシンプルな全員一緒モードに寄せる）。 */
const FAMILY_ROLE_LABELS = {
  father: { ja: "父", en: "Father" },
  mother: { ja: "母", en: "Mother" },
  grandfather: { ja: "祖父", en: "Grandfather" },
  grandmother: { ja: "祖母", en: "Grandmother" },
  fatherInLaw: { ja: "義父", en: "Father-in-law" },
  motherInLaw: { ja: "義母", en: "Mother-in-law" },
  child: { ja: "子供", en: "Child" },
  guest: { ja: "ゲスト", en: "Guest" },
};
const FAMILY_ROLE_ORDER = ["father", "mother", "grandfather", "grandmother", "fatherInLaw", "motherInLaw", "child", "guest"];
const FAMILY_MULTI_ROLES = ["child", "guest"]; // 人数が何人いてもいい役割（自動採番）
const FAMILY_MEET_STORY_PAIRS = [["father", "mother"], ["grandfather", "grandmother"], ["fatherInLaw", "motherInLaw"]];

function familyRoleLabel(key) {
  return FAMILY_ROLE_LABELS[key][state.lang] || FAMILY_ROLE_LABELS[key].en;
}

function addFamilyRoleName(key) {
  const base = familyRoleLabel(key);
  let name = base;
  if (FAMILY_MULTI_ROLES.includes(key)) {
    let n = 1;
    while (allNames().includes(`${base}${n}`)) n++;
    name = `${base}${n}`;
  } else if (allNames().includes(name)) {
    setupMessage.textContent = t("msgDup");
    return;
  }
  if (allNames().length >= 12) {
    setupMessage.textContent = t("msgMax");
    return;
  }
  state.everyone.push(name);
  setupMessage.textContent = "";
  renderChips();
}

function renderFamilyRoleRow() {
  const row = document.getElementById("family-role-row");
  if (!row) return;
  row.innerHTML = "";
  FAMILY_ROLE_ORDER.forEach((key) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn btn-sub family-role-btn";
    b.textContent = "+ " + familyRoleLabel(key);
    b.addEventListener("click", () => addFamilyRoleName(key));
    row.appendChild(b);
  });
}

/* ---------------- 🌐 法人・パーティープラン限定：第二言語の併記 ----------------
   多国籍の職場での利用を想定し、日本語(または表示言語)のお題に加えて、
   もう1つの言語でも同じお題を併記できるようにする。英語固定にはせず、
   職場の構成（例：ベトナム語話者が多い等）に合わせて9言語から選べるようにする。 */
const PARTY_BILINGUAL_STORAGE_KEY = "batsu-party-bilingual";
let partyBilingualLang = null;
try { partyBilingualLang = localStorage.getItem(PARTY_BILINGUAL_STORAGE_KEY) || null; } catch (e) {}

function partyBilingualLabel() {
  return partyBilingualLang ? LANG_LABELS[partyBilingualLang] : "OFF";
}

function updatePartyBilingualRowVisibility() {
  const row = document.getElementById("party-bilingual-row");
  if (!row) return;
  row.classList.toggle("hidden", state.pack !== "party");
  document.getElementById("btn-party-bilingual").textContent = partyBilingualLabel();
}

document.getElementById("btn-party-bilingual").addEventListener("click", () => {
  // OFF → 表示言語(state.lang)以外の8言語を順番に → OFFに戻る
  const cycle = [null, ...LANG_CYCLE.filter((l) => l !== state.lang)];
  const i = cycle.indexOf(partyBilingualLang);
  partyBilingualLang = cycle[(i + 1) % cycle.length];
  try {
    if (partyBilingualLang) localStorage.setItem(PARTY_BILINGUAL_STORAGE_KEY, partyBilingualLang);
    else localStorage.removeItem(PARTY_BILINGUAL_STORAGE_KEY);
  } catch (e) {}
  document.getElementById("btn-party-bilingual").textContent = partyBilingualLabel();
});

function updateFamilyRoleRowVisibility() {
  const row = document.getElementById("family-role-row");
  if (!row) return;
  const show = state.pack === "family" && state.mode === "all";
  row.classList.toggle("hidden", !show);
  if (show) renderFamilyRoleRow();
}

// 🍶ひとり飲みモード：登録するのは自分1人だけなので、名前欄の見た目を
// 「参加メンバー（複数人向け）」から「あなたの名前（1人向け）」に変え、
// 意味をなさない「男女に分ける」トグルは隠して全員一緒モードに固定する
function updateSetupUiForPack() {
  const isSolo = state.pack === "solo";
  const modeToggle = document.querySelector(".mode-toggle");
  if (modeToggle) modeToggle.classList.toggle("hidden", isSolo);
  if (isSolo && state.mode !== "all") setMode("all");
  document.getElementById("t-team-a").textContent = t(isSolo ? "soloNameLabel" : "teamA");
  document.getElementById("input-a").placeholder = t(isSolo ? "soloNamePlaceholder" : "placeholder");
}

// 「馴れ初め」お題：父/母・祖父/祖母・義父/義母のペアが役割タグ経由で両方参加しているときだけ、
// 一定確率で通常のお題の代わりにこちらを返す（対応言語はja/enのみ。それ以外や条件を満たさない
// ときはnullを返し、呼び出し側は通常どおりgenerateOdai()にフォールバックする）
const FAMILY_MEET_STORY_CHANCE = 0.35;
const FAMILY_MEET_STORY_PROMPTS = {
  ja: [
    (p) => `${p}さんとの馴れ初めを、惚気混みで教えてください！`,
    (p) => `${p}さんと出会った日のことを、思い出しながら話してください！`,
    (p) => `${p}さんに一目惚れした瞬間のポイントを教えてください！`,
    (p) => `${p}さんに、今夜あらためて「好きなところ」を1つ伝えてください！`,
    (p) => `${p}さんとの一番の思い出のデートを、詳しく話してください！`,
  ],
  en: [
    (p) => `Tell everyone the story of how you and ${p} first met — a little bragging is allowed!`,
    (p) => `Think back and share the day you first met ${p}.`,
    (p) => `Tell everyone what made you fall for ${p} at first sight.`,
    (p) => `Turn to ${p} right now and say one thing you love about them.`,
    (p) => `Share your favorite memory of a date with ${p}, in detail.`,
  ],
};

function tryFamilyMeetStoryOdai(fromName, lang) {
  const prompts = FAMILY_MEET_STORY_PROMPTS[lang];
  if (!prompts) return null;
  const pair = FAMILY_MEET_STORY_PAIRS.find(
    ([a, b]) => familyRoleLabel(a) === fromName || familyRoleLabel(b) === fromName
  );
  if (!pair) return null;
  const [aKey, bKey] = pair;
  const partnerName = familyRoleLabel(fromName === familyRoleLabel(aKey) ? bKey : aKey);
  if (!allNames().includes(partnerName)) return null;
  if (Math.random() > FAMILY_MEET_STORY_CHANCE) return null;
  const text = prompts[Math.floor(Math.random() * prompts.length)](partnerName);
  return { displayText: `【${fromName}】\n${text}`, speechText: text };
}

// ゲームスタート（人数チェックつき）
document.getElementById("btn-game-start").addEventListener("click", () => {
  if (state.mode === "mf") {
    const total = state.men.length + state.women.length;
    if (total === 2 && state.men.length === 1 && state.women.length === 1) {
      if (!isPremiumUnlocked()) {
        showPremiumModal(t("coupleTeaser"));
        return;
      }
      // 有料版：既に恋愛/大人向けパックを選んでいなければ、1対1モード専用のお題を既定にする
      if (state.pack === "standard") state.pack = "couple";
    } else if (state.men.length < 1 || state.women.length < 1 || total < 3) {
      setupMessage.textContent = t("msgNeedMf");
      return;
    }
  } else {
    if (state.everyone.length === 1) {
      // 🍶ひとり飲みモード：1人だけの登録は「ソロパック」選択中のみ許可(無料)
      if (state.pack !== "solo") {
        setupMessage.textContent = t("msgNeedAll");
        return;
      }
    } else if (state.everyone.length === 2) {
      if (!isPremiumUnlocked()) {
        showPremiumModal(t("coupleTeaser"));
        return;
      }
      // 既に他のパック（👑王様ゲームモード等）を選んでいるときは上書きしない（"mf"モード側と同じ扱いに揃える）
      if (state.pack === "standard") state.pack = "couple";
    } else if (state.everyone.length < 3) {
      setupMessage.textContent = t("msgNeedAll");
      return;
    }
  }
  showScreen("game");
  updatePartyBilingualRowVisibility();
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
let highlightIndex = -1; // 当たった瞬間に光らせるコマ（-1で光らせない）

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

    if (i === highlightIndex) {
      // 当たった瞬間、白くフラッシュさせる
      ctx.shadowColor = "#ffe14b";
      ctx.shadowBlur = 30;
      ctx.fillStyle = "#ffffff";
    } else {
      ctx.shadowBlur = 0;
      ctx.fillStyle = segmentColor(wheelEntries[i], i);
    }
    ctx.fill();
    ctx.shadowBlur = 0;
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

  // 外枠のネオンリング（🎨着せ替えのテーマ色に連動。
  // 色の取得は重い処理なので、毎フレームではなくテーマ変更時にキャッシュしたものを使う）
  const accentA = cachedThemeColors.a;
  const accentB = cachedThemeColors.b;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = accentA;
  ctx.lineWidth = 4;
  ctx.shadowColor = accentA;
  ctx.shadowBlur = 14;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 中央の丸
  ctx.beginPath();
  ctx.arc(cx, cy, 26, 0, Math.PI * 2);
  ctx.fillStyle = "#171028";
  ctx.fill();
  ctx.strokeStyle = accentB;
  ctx.lineWidth = 3;
  ctx.stroke();
}

// 当たったコマを、白く点滅させて視線を誘導する
function flashWinnerWedge(index) {
  let count = 0;
  const blink = () => {
    highlightIndex = count % 2 === 0 ? index : -1;
    drawWheel();
    count++;
    if (count < 6) {
      setTimeout(blink, 110);
    } else {
      highlightIndex = -1;
      drawWheel();
    }
  };
  blink();
}

// 🃏 イカサマモード：仕込んだ人がいれば高確率で当てる（なければ普通の抽選）
function pickWinnerIndex() {
  const riggedIndex = state.riggedName
    ? wheelEntries.findIndex((p) => p.name === state.riggedName)
    : -1;

  if (riggedIndex === -1) {
    return Math.floor(Math.random() * wheelEntries.length);
  }
  if (Math.random() < RIG_BOOST) return riggedIndex;

  // 外れくじ：仕込んだ人以外からランダムに選ぶ
  const others = wheelEntries.map((_, i) => i).filter((i) => i !== riggedIndex);
  return others[Math.floor(Math.random() * others.length)];
}

// くるくる回して、ランダムに1人選ぶ
function spinWheel(onDone) {
  if (spinning || wheelEntries.length === 0) return;
  spinning = true;

  const n = wheelEntries.length;
  const seg = (Math.PI * 2) / n;
  const winnerIndex = pickWinnerIndex();

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
      onDone(wheelEntries[winnerIndex], winnerIndex);
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
  // 🍶ひとり飲みモードなど、他に誰もいない場合は本人を相手にする(自分向けのお題になる)
  if (candidates.length === 0) return winner;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// 王様の罰の対象者を本人以外から最大2人、重複なしで選ぶ
// （🍶ひとり飲みモード等で他に誰もいない場合は空配列を返す＝王様ラウンド不成立）
function pickKingTargets(king) {
  const others = participants().filter((p) => p.name !== king.name);
  const shuffled = [...others].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(2, others.length));
}

// 👑王様ゲームモード専用：対象の人数も組み合わせも完全ランダムに選ぶ（本人以外1人〜全員）
// 戻り値: [] = 対象者がいない(ひとり飲み等、呼び出し側で通常お題にフォールバック)
//         null = 結果的に「その場の全員」が選ばれた（名前を並べず「王様の命令は絶対」扱いにする）
//         配列 = 実際に指名する対象者(本人以外の一部)
function pickAutoAssignedTargets(king) {
  const others = participants().filter((p) => p.name !== king.name);
  if (others.length === 0) return [];
  const shuffled = [...others].sort(() => Math.random() - 0.5);
  const count = 1 + Math.floor(Math.random() * others.length);
  if (count === others.length) return null; // 全員選ばれた＝「みんなへの自由命令」と同じ言い方にする
  return shuffled.slice(0, count);
}

// 王様回数・お題回数の記録（表彰式で使う）
function bumpStat(name, field) {
  if (!state.stats[name]) state.stats[name] = { king: 0, challenge: 0 };
  state.stats[name][field]++;
}

// 1回戦の始まり
function startRound() {
  // 🍶ひとり飲みモード（日本語UI限定）はホイールの中身を自分の名前ではなく
  // 飲み友AIの9キャラクターにする（止まったキャラとそのまま会話が始まる）
  wheelEntries =
    state.pack === "solo" && state.lang === "ja"
      ? AI_ROAST_CHARACTERS.map((c) => ({ name: c.name, team: "a" }))
      : participants();
  wheelRotation = 0;
  drawWheel();

  gameStatus.textContent = t("statusStart");
  btnSpin.textContent = t("spinBtn");
  btnSpin.disabled = false;
  wheelArea.classList.remove("hidden");
  odaiArea.classList.add("hidden");
  odaiCard.classList.remove("king-card");

  // 📡 幹事としてオンライン部屋を開いている間は、コードを表示し続ける
  if (state.onlineRole === "host" && state.onlineCode) {
    onlineHostBadge.textContent = t("onlineHostBadge")(state.onlineCode);
    onlineHostBadge.classList.remove("hidden");
  } else {
    onlineHostBadge.classList.add("hidden");
  }

  // どのパックで遊んでいるか、プレイ中も常に見えるように表示する（不具合報告時の切り分け用にも使える）
  const activePackBadge = document.getElementById("active-pack-badge");
  const activePackLabel = UI[state.lang].packs[state.pack];
  if (state.pack === "standard" || !activePackLabel) {
    activePackBadge.classList.add("hidden");
  } else {
    activePackBadge.textContent = activePackLabel;
    activePackBadge.classList.remove("hidden");
  }
}

btnSpin.addEventListener("click", () => {
  if (spinning) return;
  btnSpin.disabled = true;

  // タップした瞬間（=ユーザー操作の直後）に読み上げ機能を一度起こしておく。
  // これをしないと、iPhoneなどでは少し後で呼ばれる読み上げが無音になることがある
  unlockSpeech();

  // 回転中は煽りテキストを点滅させる
  gameStatus.textContent = t("spinTaunt");
  gameStatus.classList.add("taunt-pulse");
  SFX.spinStart();

  // 👑王様ゲームモードは確率配分が丸ごと別物なので、専用ロジックに分岐する
  if (state.pack === "kinggame") {
    runKingGameRound();
    return;
  }

  // 🍶ひとり飲みモード（日本語UI限定）は、名前のホイールではなく飲み友AI
  // キャラクターのホイールを回し、止まったキャラとそのまま会話を始める専用ロジック
  if (state.pack === "solo" && state.lang === "ja") {
    runSoloCharacterRound();
    return;
  }

  // このスピンが王様モード／審査員ハプニングになるかどうか、先に運命を決めておく
  // 🔞大人向けパックのときだけ発動率50%＋対象者指名、それ以外は従来通り10%＋全員への自由命令
  // 王様不成立が続くほど当選率をわずかに底上げする（外れ運が続く体験を和らげる。上限20%まで）
  const isAdultPack = state.pack === "adult";
  const baseKingChance = isAdultPack ? KING_CHANCE_ADULT : KING_CHANCE_STANDARD;
  const dryStreakBonus = Math.min(state.roundsSinceKing * KING_DRY_STREAK_STEP, KING_DRY_STREAK_CAP);
  const kingRound = Math.random() < baseKingChance + dryStreakBonus;
  const judgeRound = !kingRound && Math.random() < JUDGE_CHANCE;

  spinWheel((winner, idx) => {
    // 🃏 イカサマの仕込みは1回のスピンだけで自動的に解除する
    state.riggedName = null;
    btnRig.classList.remove("active");

    // 当たったコマを点滅させて視線を誘導する
    flashWinnerWedge(idx);
    gameStatus.classList.remove("taunt-pulse");

    // 大人向けパックで王様が選ばれても、対象者がいなければ（例：ひとり飲みモード）通常のお題に切り替える
    const kingTargets = kingRound && isAdultPack ? pickKingTargets(winner) : null;
    const isActualKingRound = kingRound && (!isAdultPack || (kingTargets && kingTargets.length > 0));
    state.roundsSinceKing = isActualKingRound ? 0 : state.roundsSinceKing + 1;

    bumpStat(winner.name, isActualKingRound ? "king" : "challenge");
    state.roundCount++;
    state.pendingCeremony = state.roundCount % CEREMONY_INTERVAL === 0;
    maybeQueueTrialOffer();

    Achievements.bump("totalRounds");
    if (isActualKingRound) Achievements.bump("totalKings");

    if (isActualKingRound) {
      gameStatus.textContent = t("statusKing");
      setTimeout(() => showKing(winner, kingTargets), 700);
    } else {
      gameStatus.textContent = t("statusPicked")(winner.name);
      const partner = pickPartner(winner);
      // 🧑‍⚖️ 審査員ハプニング：本人以外からランダムに審査員を指名するだけ。
      // 判定・追加の罰の中身はアプリでは決めず、その場の人間に委ねる。
      let judgeName = null;
      if (judgeRound) {
        const others = participants().filter((p) => p.name !== winner.name);
        if (others.length > 0) judgeName = others[Math.floor(Math.random() * others.length)].name;
      }
      setTimeout(() => showOdai(winner, partner, judgeName), 900);
    }
  });
});

// 👑王様ゲームモード専用のラウンド進行（QRコード等から即遊べる、王様ゲーム特化モード）
// 【無料】王様50%（全員への自由命令）／王様×自動ランダム指名30%（対象者に自由に罰）／通常ネタ20%
// 【プレミアム解放後】王様60%（全員への自由命令）／残り40%はエッチなお題
//   （仕様上の「ユーザー投稿ネタ20%」は投稿・共有機能自体が将来タスクのため今回は未実装。
//   実装され次第、この40%の一部を投稿ネタに振り分ける）
const KINGGAME_REMINDER_SHOWN_KEY = "batsu-kinggame-reminder-shown";

function runKingGameRound() {
  const premium = isPremiumUnlocked();
  const roll = Math.random();

  spinWheel((winner, idx) => {
    state.riggedName = null;
    btnRig.classList.remove("active");
    flashWinnerWedge(idx);
    gameStatus.classList.remove("taunt-pulse");

    state.roundCount++;
    state.pendingCeremony = state.roundCount % CEREMONY_INTERVAL === 0;
    maybeQueueTrialOffer();
    Achievements.bump("totalRounds");

    // 安全ガイドは「このデバイスで王様が誕生した最初の1回」だけ表示する。
    // それ以降は毎回表示すると読み飛ばされて逆効果になるため、一度読めば十分とみなす。
    let reminderShown = false;
    try { reminderShown = localStorage.getItem(KINGGAME_REMINDER_SHOWN_KEY) === "1"; } catch (e) {}
    const showReminder = !reminderShown;

    const runKing = (targets) => {
      bumpStat(winner.name, "king");
      Achievements.bump("totalKings");
      gameStatus.textContent = t("statusKing");
      if (showReminder) {
        try { localStorage.setItem(KINGGAME_REMINDER_SHOWN_KEY, "1"); } catch (e) {}
      }
      setTimeout(() => showKing(winner, targets, showReminder), 700);
    };
    const runOdai = (packOverride) => {
      bumpStat(winner.name, "challenge");
      gameStatus.textContent = t("statusPicked")(winner.name);
      const partner = pickPartner(winner);
      setTimeout(() => showOdai(winner, partner, null, packOverride), 900);
    };

    if (!premium) {
      if (roll < 0.5) {
        runKing(null); // 王様の自由命令（全員向け）
      } else if (roll < 0.8) {
        const targets = pickAutoAssignedTargets(winner);
        // 対象者がいない（例：ひとり飲み）ときは通常のお題にフォールバック。
        // 結果的に全員が対象になった(null)ときは「みんなへの自由命令」スタイルで表示する。
        if (targets === null) runKing(null);
        else if (targets.length > 0) runKing(targets);
        else runOdai("standard");
      } else {
        runOdai("standard");
      }
    } else {
      if (roll < 0.6) {
        runKing(null);
      } else {
        runOdai("adult"); // 🔞エッチなお題
      }
    }
  });
}

// 🍶ひとり飲みモード専用のラウンド進行（日本語UI限定）：
// wheelEntriesは飲み友AIの9キャラクターで構成されている（startRound()側で設定）。
// 王様・審査員ハプニングは対象外で、止まったキャラクターとそのまま飲み友AIチャットを始める
function runSoloCharacterRound() {
  spinWheel((winner, idx) => {
    state.riggedName = null;
    btnRig.classList.remove("active");
    flashWinnerWedge(idx);
    gameStatus.classList.remove("taunt-pulse");
    btnSpin.disabled = false;

    state.roundCount++;
    Achievements.bump("totalRounds");

    const character = AI_ROAST_CHARACTERS[idx];
    gameStatus.textContent = t("statusPicked")(character.name);
    setTimeout(() => openRoastChat(character), 900);
  });
}

// 結果発表の瞬間の演出（紙吹雪・振動）をまとめて起動する
function celebrate(colors, vibrationPattern) {
  Confetti.burst(colors);
  if ("vibrate" in navigator) {
    try { navigator.vibrate(vibrationPattern); } catch (e) {}
  }
}

// お題の発表（生成 → 表示 → 朗読）
// judgeName を渡すと「🧑‍⚖️今回の審査員は〇〇！」を先頭に添える(🧑‍⚖️審査員ハプニング)。
// 審査員の判定・追加の罰の中身はアプリでは決めず、その場の人間に委ねる。
// packOverride: 👑王様ゲームモード等、state.packとは別のお題パック（例:"adult"）で生成したいときに指定する。
function showOdai(from, to, judgeName, packOverride) {
  state.isKing = false;
  state.currentJudgeName = judgeName || null;
  state.currentPair = { from, to };
  state.currentOdaiPack = packOverride || null;
  const odaiPack = packOverride || state.pack;

  const odai =
    (odaiPack === "family" && tryFamilyMeetStoryOdai(from.name, state.lang)) ||
    generateOdai(from.name, to.name, state.lang, odaiPack);

  // 🌐 法人・パーティープラン限定：第二言語が設定されていれば、同じ組み合わせ
  // （situationIdx/actionIdxが同じ）をもう1つの言語でも生成し、あとで併記する
  let bilingual = null;
  if (
    odaiPack === "party" &&
    partyBilingualLang &&
    partyBilingualLang !== state.lang &&
    odai.situationIdx !== undefined
  ) {
    bilingual = generateOdai(from.name, to.name, partyBilingualLang, odaiPack, {
      situationIdx: odai.situationIdx,
      actionIdx: odai.actionIdx,
    });
  }

  const judgePrefix = judgeName ? t("judgeAnnounce")(judgeName) : "";
  const judgeSpeechPrefix = judgeName ? t("judgeAnnounceSpeech")(judgeName) : "";
  const finalDisplay = judgePrefix + odai.displayText + (bilingual ? "\n\n🌐 " + bilingual.displayText : "");
  state.currentSpeech = judgeSpeechPrefix + odai.speechText + (bilingual ? "。 " + bilingual.speechText : "");

  gameStatus.textContent = t("statusOdai");
  odaiCard.classList.remove("king-card");
  odaiCard.classList.toggle("judge-card", !!judgeName);
  btnPass.classList.remove("hidden");
  wheelArea.classList.add("hidden");
  odaiArea.classList.remove("hidden");

  // 🎰 本命の前に、ダミー候補を2つポポポンと高速表示してから確定させる演出
  const decoys = [
    judgePrefix + generateOdai(from.name, to.name, state.lang, odaiPack).displayText,
    judgePrefix + generateOdai(from.name, to.name, state.lang, odaiPack).displayText,
  ];
  const sequence = [...decoys, finalDisplay];
  let step = 0;
  const popInterval = setInterval(() => {
    odaiCard.textContent = sequence[step];
    odaiCard.classList.remove("odai-pop");
    void odaiCard.offsetWidth; // リフローさせてアニメーションを再生させる
    odaiCard.classList.add("odai-pop");
    step++;
    if (step >= sequence.length) {
      clearInterval(popInterval);
      finishOdaiReveal({ displayText: finalDisplay, speechText: state.currentSpeech });
    }
  }, 260);
}

// 「お題確定」の瞬間だけ発生させたい演出・処理(紙吹雪・効果音・ハイライト保存・読み上げ)
function finishOdaiReveal(odai) {
  const accentA = cachedThemeColors.a;
  const accentB = cachedThemeColors.b;
  celebrate([accentA, accentB, "#ffffff"], 80);
  SFX.reveal();

  lastHighlightDataUrl = Highlights.capture(odai.displayText, accentA, document.getElementById("t-logo").textContent);
  if (state.onlineRole === "host") {
    Online.broadcast({ type: "odai", displayText: odai.displayText, speechText: odai.speechText, lang: state.lang });
  }

  speakOdai(odai.speechText, state.lang, resolveVoice());
  startHypeChallenge();
}

// 👑 王様モード！
// targets が配列（🔞大人向けパック／👑王様ゲームモード）: 王様が対象者を指名し、その場で
//   自由に罰を命じる。罰の中身はアプリでは決めず人間に委ねる代わりに、画面に安全ガイド
//   （宗教政治NG・強要飲酒NG・接触はソフトタッチまで・外見いじりNG・パス自由）を表示する。
// targets が null（標準パック等）: 従来通り、対象を指定せず「みんなへの自由命令」のまま。
// showReminder（👑王様ゲームモード）: 安全ガイドをカードに表示するかどうか。初回の免責
//   モーダルとは別に、実際に王様になった人が読む機会を最低1回作るためのものなので、
//   このデバイスで一度でも表示済みなら以降は表示しない（runKingGameRound()側で判定）。
function showKing(king, targets, showReminder) {
  state.isKing = true;
  state.currentJudgeName = null;
  state.currentPair = null;
  state.currentKing = king;
  state.currentKingTargets = targets;
  state.currentKingShowReminder = !!showReminder;
  const targetNames = targets ? targets.map((p) => p.name) : null;
  state.currentSpeech = t("kingSpeech")(king.name, targetNames);

  gameStatus.textContent = t("statusKing");
  odaiCard.textContent = t("kingCard")(king.name, targetNames, showReminder);
  odaiCard.classList.remove("judge-card");
  odaiCard.classList.add("king-card");
  if (targetNames) {
    btnPass.classList.remove("hidden"); // 🔞対象者は罰の内容を聞く前でもパスしてOK（対象者を選び直す）
  } else {
    btnPass.classList.add("hidden"); // 標準パック：王様の命令にパスはない！
  }
  wheelArea.classList.add("hidden");
  odaiArea.classList.remove("hidden");

  celebrate(["#ffe14b", "#ffb52d", "#ffffff"], [100, 50, 100, 50, 200]);
  SFX.kingFanfare();

  lastHighlightDataUrl = Highlights.capture(t("kingCard")(king.name, targetNames, showReminder), "#ffe14b", document.getElementById("t-logo").textContent);
  if (state.onlineRole === "host") {
    Online.broadcast({ type: "king", displayText: t("kingCard")(king.name, targetNames, showReminder), speechText: state.currentSpeech, lang: state.lang });
  }

  speakOdai(state.currentSpeech, state.lang, resolveVoice());
  startHypeChallenge();
}

// もう一度読み上げ（さっきと同じ声で）
document.getElementById("btn-speak").addEventListener("click", () => {
  if (state.currentSpeech) speakOdai(state.currentSpeech, state.lang, state.currentVoice);
});

// パス（同じ2人・同じ審査員(いれば)のまま、お題だけ変える／王様ラウンドは同じ王様のまま対象者を選び直す）
btnPass.addEventListener("click", () => {
  if (state.isKing) {
    if (!state.currentKing || !state.currentKingTargets) return; // 標準パックの王様はパス不可
    odaiCard.style.animation = "none";
    void odaiCard.offsetWidth;
    odaiCard.style.animation = "";
    // 👑王様ゲームモードは人数も組み合わせも毎回完全ランダム、それ以外(🔞大人向けパック)は最大2人固定
    const newTargets = state.pack === "kinggame"
      ? pickAutoAssignedTargets(state.currentKing)
      : pickKingTargets(state.currentKing);
    showKing(state.currentKing, newTargets, state.currentKingShowReminder);
    Achievements.bump("totalPasses");
    return;
  }
  if (!state.currentPair) return;
  odaiCard.style.animation = "none";
  void odaiCard.offsetWidth;
  odaiCard.style.animation = "";
  showOdai(state.currentPair.from, state.currentPair.to, state.currentJudgeName, state.currentOdaiPack);
  Achievements.bump("totalPasses");
});

// 📤 共有（対応端末はOSの共有シートを開き、非対応ならリンクをコピーする）
const GAME_URL = "https://marimo530122-cmyk.github.io/baturu-retto/";
let lastHighlightDataUrl = null; // 直前のお題ハイライト画像（TikTok/Instagram向けの画像共有用）

// 🐦 世界向けハッシュタグ（X等の公開SNSシェア専用。個人間チャットには付けない）
// ※「#DirtyDare」案は「不快感を与えない」基準に沿うよう「#NaughtyDare」（茶目っ気のある響き）に調整した
const WORLD_HASHTAGS = "#BatsuRoulette #AdultPartyGame #SpicyRoulette #NaughtyDare #SafeFun";

// 🚀 バイラル投稿キット用のキャプション案（言語別・ランダム表示）
// ※ゲーム本来の面白さ（お題発表の反応・王様モードの驚き等）にフォーカスし、
//   誰かを欺いたり不快にさせたりする内容は含めない
const VIRAL_CAPTIONS = {
  ja: [
    "この罰ゲーム、当たった瞬間の顔が面白すぎたｗｗｗ",
    "友達に見せたら即ダウンロードされた神アプリ",
    "王様降臨した瞬間、テンションぶち上がったwww",
    "スマホ1台でここまで盛り上がるとは思わなかった",
    "音声で読み上げてくれるのが地味に神すぎる",
  ],
  en: [
    "The reaction when the dare got revealed was priceless lol",
    "My friends downloaded this the second they saw it",
    "The King Mode moment broke the entire room 😭",
    "Didn't expect one phone to turn the whole party upside down",
    "It reads the dare out loud and it's somehow the best part",
  ],
  zh: [
    "題目公布的那一瞬間，表情太好笑了ｗｗｗ",
    "朋友看到馬上就下載的神App",
    "國王降臨的瞬間，全場氣氛直接爆炸",
    "沒想到一支手機就能讓聚會嗨成這樣",
    "還會語音唸出題目，這個功能太神了",
  ],
  ko: [
    "벌칙 공개되는 순간 표정이 레전드였음ㅋㅋㅋ",
    "친구한테 보여줬더니 바로 다운받은 앱",
    "왕 탄생하는 순간 분위기 미쳤다",
    "폰 하나로 이렇게까지 분위기 살아날 줄이야",
    "음성으로 읽어주는 게 은근 신의 한 수",
  ],
  es: [
    "La cara que puso al revelar el reto fue oro puro jaja",
    "Mis amigos lo descargaron en cuanto lo vieron",
    "El Modo Rey rompió la fiesta por completo 😭",
    "No esperaba que un solo celular animara toda la fiesta así",
    "Lee el reto en voz alta y es lo mejor de todo",
  ],
  pt: [
    "A cara que ela fez quando o desafio apareceu foi impagável kkkk",
    "Meus amigos baixaram na hora que viram",
    "O Modo Rei detonou a festa inteira 😭",
    "Não esperava que um celular animasse a festa desse jeito",
    "Ele lê o desafio em voz alta e essa é a melhor parte",
  ],
  vi: [
    "Biểu cảm lúc thử thách được công bố buồn cười xỉu ｗｗｗ",
    "Cho bạn bè xem là tải app liền luôn",
    "Khoảnh khắc Vua xuất hiện làm cả phòng nổ tung 😭",
    "Không ngờ một chiếc điện thoại lại làm bữa tiệc bùng nổ đến vậy",
    "Còn đọc to thử thách nữa, chi tiết này quá đỉnh",
  ],
};

// X（旧Twitter）専用シェア：投稿画面をタブで開く（Web Intent）。ハッシュタグはここでのみ付与する
function shareToX(text) {
  const fullText = `${text}\n\n${WORLD_HASHTAGS}`;
  const intentUrl =
    "https://twitter.com/intent/tweet?text=" + encodeURIComponent(fullText) +
    "&url=" + encodeURIComponent(GAME_URL);
  window.open(intentUrl, "_blank", "noopener,width=550,height=420");
}

/* ---------------------------------------------------------
   📲 WhatsApp / Telegram / Instagram / WeChat 専用シェア
   ---------------------------------------------------------
   ・WhatsApp / Telegramは公式のWeb Intentがあるため、
     本文とURLをセットした状態で送信先選択画面まで自動で開ける
   ・Instagram / WeChatには、投稿画面に本文を自動セットする
     公式な仕組みが存在しない（スパム対策のため非公開）。
     そのため「本文をコピー → アプリを開く → 貼り付けてもらう」
     方式で代用する
   --------------------------------------------------------- */

// WhatsApp：DM共有と同じ扱いなのでハッシュタグは付けない
function shareToWhatsApp(text) {
  const url = "https://wa.me/?text=" + encodeURIComponent(`${text}\n${GAME_URL}`);
  window.open(url, "_blank", "noopener");
}

// Telegram：DM共有と同じ扱いなのでハッシュタグは付けない
function shareToTelegram(text) {
  const url =
    "https://t.me/share/url?url=" + encodeURIComponent(GAME_URL) +
    "&text=" + encodeURIComponent(text);
  window.open(url, "_blank", "noopener");
}

// Instagram / WeChat 共通：本文をコピー →「アプリを開く」ボタンで確認してもらってから起動する
// （コピーと同時にアプリへ切り替わると、コピー完了に気づけないまま貼り付けそこねるため、
//   ユーザーの確認を挟んでからアプリを開く2段階の流れにしている）
const modalCopyShare = document.getElementById("modal-copy-share");
let pendingShareAppUrl = null;

async function shareViaCopyAndOpen(text, appUrl, appLabel) {
  try {
    await navigator.clipboard.writeText(`${text}\n${GAME_URL}`);
  } catch (e) {
    showToast(GAME_URL); // クリップボードが使えない端末では、リンクを表示するだけに留める
    return;
  }
  pendingShareAppUrl = appUrl;
  document.getElementById("t-copyshare-title").textContent = t("copyShareTitle");
  document.getElementById("copyshare-text").textContent = t("copyShareText")(appLabel);
  document.getElementById("copyshare-open").textContent = t("copyShareOpen")(appLabel);
  document.getElementById("copyshare-close").textContent = t("copyShareClose");
  modalCopyShare.classList.remove("hidden");
}

document.getElementById("copyshare-open").addEventListener("click", () => {
  modalCopyShare.classList.add("hidden");
  if (pendingShareAppUrl) window.open(pendingShareAppUrl, "_blank", "noopener");
  pendingShareAppUrl = null;
});
document.getElementById("copyshare-close").addEventListener("click", () => {
  modalCopyShare.classList.add("hidden");
  pendingShareAppUrl = null;
});

function shareToInstagram(text) {
  const fullText = `${text}\n\n${WORLD_HASHTAGS}`; // Instagramは公開SNS扱いなのでハッシュタグを付与
  shareViaCopyAndOpen(fullText, "https://www.instagram.com/", "Instagram");
}

function shareToWeChat(text) {
  shareViaCopyAndOpen(text, "https://www.wechat.com/", "WeChat"); // DM/グループ共有と同じ扱いなのでハッシュタグは付けない
}

// dataURL(PNG) を共有用のFileに変換する
async function dataUrlToFile(dataUrl, filename) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: "image/png" });
}

async function shareContent(text, dataUrl) {
  // 画像つき共有に対応した端末では、ハイライト画像を添えて共有する
  // （ショート動画のサムネにも使いやすいよう、正方形の画像を用意している）
  if (navigator.share && navigator.canShare && dataUrl) {
    try {
      const file = await dataUrlToFile(dataUrl, "batsu-roulette.png");
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ text, url: GAME_URL, files: [file] });
        return;
      }
    } catch (e) {
      // 画像共有に失敗したら、下のテキスト共有にフォールバックする
    }
  }
  if (navigator.share) {
    try {
      await navigator.share({ text, url: GAME_URL });
      return;
    } catch (e) {
      return; // ユーザーがキャンセルした場合など
    }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${GAME_URL}`);
    showToast(t("shareCopied"));
  } catch (e) {
    showToast(GAME_URL);
  }
}

document.getElementById("btn-share-app").addEventListener("click", () => {
  shareContent(t("shareAppText"));
});
document.getElementById("btn-share-x-app").addEventListener("click", () => {
  shareToX(t("shareAppText"));
});
document.getElementById("btn-share-whatsapp-app").addEventListener("click", () => {
  shareToWhatsApp(t("shareAppText"));
});
document.getElementById("btn-share-telegram-app").addEventListener("click", () => {
  shareToTelegram(t("shareAppText"));
});
document.getElementById("btn-share-instagram-app").addEventListener("click", () => {
  shareToInstagram(t("shareAppText"));
});
document.getElementById("btn-share-wechat-app").addEventListener("click", () => {
  shareToWeChat(t("shareAppText"));
});

/* ---------------- 🎬 RECモード（動画撮影用の見た目に切り替える） ---------------- */
const btnRecMode = document.getElementById("btn-rec-mode");
btnRecMode.addEventListener("click", () => {
  const on = document.body.classList.toggle("rec-mode");
  btnRecMode.classList.toggle("active", on);
  showToast(on ? t("recModeOn") : t("recModeOff"));
});

/* ---------------- 🚀 バイラル投稿キット ---------------- */
const btnViralKit = document.getElementById("btn-viral-kit");
const modalViral = document.getElementById("modal-viral");
let currentViralCaption = "";

function pickViralCaption() {
  const list = VIRAL_CAPTIONS[state.lang] || VIRAL_CAPTIONS.en;
  currentViralCaption = list[Math.floor(Math.random() * list.length)];
  document.getElementById("viral-caption-text").textContent = currentViralCaption;
}

function renderViralKit() {
  document.getElementById("t-viral-title").textContent = t("viralTitle");
  document.getElementById("t-viral-desc").textContent = t("viralDesc");
  document.getElementById("viral-regenerate").textContent = t("viralRegenerate");
  document.getElementById("viral-copy-all").textContent = t("viralCopyAll");
  document.getElementById("viral-copy-shorturl").textContent = t("viralCopyShortUrl");
  document.getElementById("viral-close").textContent = t("viralClose");
  document.getElementById("viral-hashtags").textContent = WORLD_HASHTAGS;
  document.getElementById("viral-script").textContent = t("viralScript");
  document.getElementById("viral-shorturl-message").textContent = "";
  pickViralCaption();
}

btnViralKit.addEventListener("click", () => {
  renderViralKit();
  modalViral.classList.remove("hidden");
});
document.getElementById("viral-regenerate").addEventListener("click", pickViralCaption);
document.getElementById("viral-close").addEventListener("click", () => {
  modalViral.classList.add("hidden");
});

document.getElementById("viral-copy-all").addEventListener("click", async () => {
  const full = `${currentViralCaption}\n\n${t("viralScript")}\n\n${WORLD_HASHTAGS}\n${GAME_URL}`;
  try {
    await navigator.clipboard.writeText(full);
    showToast(t("shareCopied"));
  } catch (e) {
    showToast(GAME_URL);
  }
});

// 短縮URL：TinyURLの無認証APIを使用。失敗したら通常のURLをコピーする
document.getElementById("viral-copy-shorturl").addEventListener("click", async () => {
  const msg = document.getElementById("viral-shorturl-message");
  msg.textContent = t("viralShortening");
  try {
    const res = await fetch("https://tinyurl.com/api-create.php?url=" + encodeURIComponent(GAME_URL));
    if (!res.ok) throw new Error("shorten failed");
    const shortUrl = (await res.text()).trim();
    if (!shortUrl.startsWith("http")) throw new Error("unexpected response");
    await navigator.clipboard.writeText(shortUrl);
    msg.textContent = t("viralShortUrlCopied")(shortUrl);
  } catch (e) {
    try {
      await navigator.clipboard.writeText(GAME_URL);
      msg.textContent = t("viralShortUrlFallback");
    } catch (e2) {
      msg.textContent = GAME_URL;
    }
  }
});

/* ---------------- 🔗 お友達紹介 / アフィリエイト ---------------- */
const btnReferral = document.getElementById("btn-referral");
const modalReferral = document.getElementById("modal-referral");

function renderReferral() {
  document.getElementById("t-referral-title").textContent = t("referralTitle");
  document.getElementById("t-referral-desc").textContent = t("referralDesc");
  document.getElementById("referral-copy").textContent = t("referralCopy");
  document.getElementById("t-referral-affiliate-note").textContent = t("referralAffiliateNote");
  document.getElementById("referral-close").textContent = t("referralClose");
  document.getElementById("referral-link-input").value =
    typeof Referral !== "undefined" ? Referral.getShareLink() : "";
  document.getElementById("referral-bonus-status").textContent =
    typeof Referral !== "undefined" && Referral.hasActiveBonus() ? t("referralBonusActive") : "";
}

btnReferral.addEventListener("click", () => {
  renderReferral();
  modalReferral.classList.remove("hidden");
});
document.getElementById("referral-close").addEventListener("click", () => {
  modalReferral.classList.add("hidden");
});
document.getElementById("referral-copy").addEventListener("click", async () => {
  const link = document.getElementById("referral-link-input").value;
  try {
    await navigator.clipboard.writeText(link);
    showToast(t("referralCopied"));
  } catch (e) {
    showToast(link);
  }
});

document.getElementById("btn-share").addEventListener("click", () => {
  if (!odaiCard.textContent) return;
  shareContent(t("shareOdaiText")(odaiCard.textContent), lastHighlightDataUrl);
});
document.getElementById("btn-share-x").addEventListener("click", () => {
  if (!odaiCard.textContent) return;
  shareToX(odaiCard.textContent);
});
document.getElementById("btn-share-whatsapp").addEventListener("click", () => {
  if (!odaiCard.textContent) return;
  shareToWhatsApp(odaiCard.textContent);
});
document.getElementById("btn-share-telegram").addEventListener("click", () => {
  if (!odaiCard.textContent) return;
  shareToTelegram(odaiCard.textContent);
});
document.getElementById("btn-share-instagram").addEventListener("click", () => {
  if (!odaiCard.textContent) return;
  shareToInstagram(odaiCard.textContent);
});
document.getElementById("btn-share-wechat").addEventListener("click", () => {
  if (!odaiCard.textContent) return;
  shareToWeChat(odaiCard.textContent);
});

// 次のルーレットへ（10ラウンドごとに表彰式、5ラウンド目に1回だけお試し案内を挟む）
document.getElementById("btn-next").addEventListener("click", () => {
  speechSynthesis.cancel();
  if (state.pendingCeremony) {
    state.pendingCeremony = false;
    showCeremony();
  } else if (state.pendingTrialOffer) {
    state.pendingTrialOffer = false;
    showTrialOfferModal();
  } else {
    startRound();
  }
});

/* ---------------- 🎁 24時間お試し案内モーダル ---------------- */
const modalTrialOffer = document.getElementById("modal-trial-offer");

function showTrialOfferModal() {
  document.getElementById("t-trial-title").textContent = t("trialOfferTitle");
  document.getElementById("t-trial-desc").textContent = t("trialOfferDesc");
  document.getElementById("trial-accept").textContent = t("trialOfferAccept");
  document.getElementById("trial-decline").textContent = t("trialOfferDecline");
  modalTrialOffer.classList.remove("hidden");
}

function closeTrialOfferModal() {
  modalTrialOffer.classList.add("hidden");
  try { localStorage.setItem(TRIAL_OFFER_SHOWN_KEY, "1"); } catch (e) {}
  startRound();
}

document.getElementById("trial-accept").addEventListener("click", () => {
  if (typeof Referral !== "undefined") Referral.grantBonus();
  document.body.classList.add("premium-active");
  document.getElementById("premium-badge").classList.remove("hidden");
  if (typeof Ads !== "undefined") Ads.refresh();
  celebrate(["#ffe14b", "#ffb52d", "#ffffff"], [100, 50, 100, 50, 200]);
  SFX.kingFanfare();
  closeTrialOfferModal();
});

document.getElementById("trial-decline").addEventListener("click", () => {
  closeTrialOfferModal();
});

// 🏆 表彰式：王様回数・お題回数のランキングを表示
function showCeremony() {
  const entries = Object.entries(state.stats);

  const topKing = entries.reduce(
    (best, [name, s]) => (s.king > (best ? best[1].king : 0) ? [name, s] : best),
    null
  );
  const topChallenge = entries.reduce(
    (best, [name, s]) => (s.challenge > (best ? best[1].challenge : 0) ? [name, s] : best),
    null
  );

  document.getElementById("ceremony-title").textContent = t("ceremonyTitle")(state.roundCount);
  document.getElementById("ceremony-king").textContent =
    topKing && topKing[1].king > 0 ? t("ceremonyKing")(topKing[0], topKing[1].king) : t("ceremonyNoKing");
  document.getElementById("ceremony-challenge").textContent =
    topChallenge && topChallenge[1].challenge > 0
      ? t("ceremonyChallenge")(topChallenge[0], topChallenge[1].challenge)
      : "";

  showScreen("ceremony");
}

document.getElementById("btn-ceremony-continue").addEventListener("click", () => {
  showScreen("game");
  updatePartyBilingualRowVisibility();
  startRound();
});

/* ---------------- 初期化 ---------------- */
// 前回選んだ言語・声・テーマ（有料機能）を覚えておく
try {
  const savedLang = localStorage.getItem("batsu-lang");
  if (LANG_CYCLE.includes(savedLang)) {
    state.lang = savedLang; // 前回選んだ言語を優先
  } else {
    state.lang = detectBrowserLang(); // 初回訪問：ブラウザの言語設定から自動判定
  }
  const savedVoice = localStorage.getItem("batsu-voice");
  if (PERSONA_CYCLE.includes(savedVoice)) state.voicePersona = savedVoice;
  const savedTheme = localStorage.getItem("batsu-theme");
  if (isPremiumUnlocked() && THEME_CYCLE.includes(savedTheme)) state.theme = savedTheme;
  // 👑王様ゲームモードは無料・年齢確認等が不要なパックなので、前回選んでいれば黙って復元する
  if (localStorage.getItem(PACK_STORAGE_KEY) === "kinggame") {
    state.pack = "kinggame";
    btnKingGame.classList.add("active-pack");
  }
  // 🔊盛り上がりメーターの設定を復元（実際のマイク起動はゲーム画面に入った時、showScreen()内で行う）
  if (localStorage.getItem("batsu-hype-enabled") === "1") {
    state.hypeEnabled = true;
    btnHype.classList.add("active");
  }
} catch (e) {}

// 一部のスマホは音声リストの読み込みが遅れるため、先に読み込みを促しておく
if ("speechSynthesis" in window) speechSynthesis.getVoices();

applyLanguage();
updateVoiceButton();
applyTheme();
renderChips();

// 💎 プレミアム解放中は、背景・ボタン演出を大人っぽく豪華にする
if (isPremiumUnlocked()) {
  document.body.classList.add("premium-active");
  document.getElementById("premium-badge").classList.remove("hidden");
}

// 📢 広告（無料版のみ表示。ads-config.js が未設定なら何も起きない）
if (typeof Ads !== "undefined") Ads.refresh();

// Stripeの決済リンクから戻ってきて、たった今プレミアムが解放された場合だけお祝いを出す
if (typeof Billing !== "undefined" && Billing.wasJustUnlocked()) {
  showPremiumUnlockedCelebration();
}

// 左上の丸アイコン群(.floating-controls)は position:fixed のため、実際の高さ分の
// 余白がタイトル文字側に自動確保されない。アイコンが増減しても文字と重ならないよう、
// 実測した高さを --toolbar-h としてCSS側に渡す（画面回転・リサイズ時も再計測）
function updateToolbarHeight() {
  const el = document.querySelector(".floating-controls");
  if (!el) return;
  document.documentElement.style.setProperty("--toolbar-h", el.getBoundingClientRect().height + "px");
}
updateToolbarHeight();
window.addEventListener("resize", updateToolbarHeight);
