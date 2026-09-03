/* =========================================================
   お題ジェネレーター【掛け算システム】日本語・英語対応
   シチュエーション50種 × 行動50種 = 2500通り（言語ごと）
   ---------------------------------------------------------
   使い方:
     const odai = generateOdai("たろう", "はなこ");        // 日本語
     const odai = generateOdai("Tom", "Amy", "en");       // 英語
     画面表示 → odai.displayText
     朗読     → speakOdai(odai.speechText, "ja" または "en");
   ========================================================= */

/* 📦 お題データ本体（9パック分）は odai-data.js に分離済み。
   index.htmlで odai-data.js を先に読み込む前提のグローバル参照。
   （2026-08-11、game.jsと合わせてファイルを軽量化） */

/* ---------------------------------------------------------
   🍺 スポンサータイアップ枠（協賛ブランドの広告お題）
   ---------------------------------------------------------
   実際にスポンサー企業と契約が決まったら、brandName を
   入力して enabled を true にしてください。未契約の間
   （brandName が空、または enabled が false）は完全に
   無効で、通常のお題だけが出ます。
   --------------------------------------------------------- */
const SPONSOR_CONFIG = {
  enabled: false, // 契約が決まったら true にする
  brandName: "", // 例: "○○ビール"
  frequency: 0.1, // お題全体のうち何割をスポンサー枠にするか（0.1 = 10%）
  templates: {
    ja: [
      "{brand}で乾杯して、一気に飲み干す",
      "{brand}を片手に、感謝の気持ちを叫ぶ",
      "{brand}のCM風ポーズを決めながら、ひとことPRする",
      "{brand}への愛を、3秒スピーチで語る",
    ],
    en: [
      "toast with {brand} and drink it all in one go",
      "hold up a {brand} and shout your thanks",
      "strike a {brand} commercial pose and give a one-line pitch",
      "declare your love for {brand} in a 3-second speech",
    ],
  },
};

// スポンサー枠が有効なら、一定確率でアクションをブランド入りの文言に差し替える
function maybeInjectSponsorAction(action, lang) {
  if (!SPONSOR_CONFIG.enabled || !SPONSOR_CONFIG.brandName) return action;
  if (Math.random() >= SPONSOR_CONFIG.frequency) return action;
  const templates = SPONSOR_CONFIG.templates[lang] || SPONSOR_CONFIG.templates.ja;
  const template = pickRandom(templates);
  return template.split("{brand}").join(SPONSOR_CONFIG.brandName);
}

/* ---------------------------------------------------------
   お題の生成（掛け算：50 × 50 = 2500通り）
   --------------------------------------------------------- */

// 配列からランダムに1つ選ぶ
function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// 直前と全く同じ組み合わせが連続で出るのを防ぐ
let lastCombinationKey = "";

// 直近数回で使ったシチュエーション/行動を覚えておき、短い間隔での再登場を避ける
// （パック・言語ごとに別管理。文言の中身自体は別物なので、切り替えたら別カウントにする）
const RECENT_ODAI_WINDOW = 4;
const recentOdaiHistory = new Map(); // key: `${pack}|${lang}` -> { situations: string[], actions: string[] }

function getRecentOdaiHistory(pack, lang) {
  const key = pack + "|" + lang;
  if (!recentOdaiHistory.has(key)) {
    recentOdaiHistory.set(key, { situations: [], actions: [] });
  }
  return recentOdaiHistory.get(key);
}

/**
 * お題を生成する
 * @param {string} fromName - お題を実行する人の名前
 * @param {string} toName   - お題の相手の名前
 * @param {string} lang     - "ja" / "en" / "zh" / "ko" / "es"
 * @param {string} pack     - "standard"（通常）または "romance"（💌恋愛パック）または "adult"（🔞大人向けパック）または "party"（🎉法人・パーティープラン）または "noalcohol"（🥤ノンアルコール版・無料、いずれも現在は日英のみ）
 * @returns {object} displayText: 画面表示用 / speechText: 朗読用
 */
// forceIndices（省略可）: {situationIdx, actionIdx} を渡すと、そのインデックスの
// シチュエーション・アクションを使う（ランダム抽選をスキップ）。
// 🌐 バイリンガル表示（法人・パーティープラン限定）で、同じ組み合わせを
// 2つの言語で表示するために、片方の言語で選んだインデックスをもう片方にも使い回す用途。
function generateOdai(fromName, toName, lang = "ja", pack = "standard", forceIndices) {
  const PACK_DATA = { romance: ROMANCE_DATA, adult: ADULT_DATA, family: FAMILY_DATA, couple: COUPLE_DATA, party: PARTY_DATA, noalcohol: NOALCOHOL_DATA, solo: SOLO_DATA };
  const data =
    PACK_DATA[pack] ? PACK_DATA[pack][lang] || ODAI_DATA[lang] || ODAI_DATA.ja // 未対応言語は通常パックに戻す
      : ODAI_DATA[lang] || ODAI_DATA.ja;
  let situation, action, key, situationIdx, actionIdx;

  if (forceIndices) {
    situationIdx = forceIndices.situationIdx % data.situations.length;
    actionIdx = forceIndices.actionIdx % data.actions.length;
    situation = data.situations[situationIdx];
    action = data.actions[actionIdx];
  } else {
    // 同じ組み合わせが2回連続、または直近で使ったシチュエーション/行動が
    // 出てしまったら引き直す（プールが小さいパックでも詰まないよう試行回数に上限を設ける）
    const hist = getRecentOdaiHistory(pack, lang);
    let attempts = 0;
    do {
      situationIdx = Math.floor(Math.random() * data.situations.length);
      actionIdx = Math.floor(Math.random() * data.actions.length);
      situation = data.situations[situationIdx];
      action = data.actions[actionIdx];
      key = situation + "|" + action;
      attempts++;
    } while (
      attempts < 20 &&
      (key === lastCombinationKey || hist.situations.includes(situation) || hist.actions.includes(action))
    );
    lastCombinationKey = key;
    hist.situations.push(situation);
    if (hist.situations.length > RECENT_ODAI_WINDOW) hist.situations.shift();
    hist.actions.push(action);
    if (hist.actions.length > RECENT_ODAI_WINDOW) hist.actions.shift();
  }

  action = maybeInjectSponsorAction(action, lang);

  let displayText, speechText;

  if (pack === "solo") {
    // 🍶ひとり飲みモードは相手がいないので「から〜へ」を出さず、本人名だけ表示する
    if (lang === "ja") {
      displayText = `【${fromName}】\n${situation}、\n${action}！`;
      speechText = `${fromName}さん！${situation}、${action}！`;
    } else if (lang === "de") {
      displayText = `【${fromName}】\n${situation},\n${action}!`;
      speechText = `${fromName}! ${situation}, ${action}!`;
    } else if (lang === "tl") {
      displayText = `【${fromName}】\n${situation},\n${action}!`;
      speechText = `${fromName}! ${situation}, ${action}!`;
    } else {
      // en/zh/ko/es/pt/vi はSOLO_DATA未対応のため通常英語表記でフォールバック
      displayText = `【${fromName}】\n${situation},\n${action}!`;
      speechText = `${fromName}! ${situation}, ${action}!`;
    }
    return { displayText, speechText: toSpeechSafe(speechText), situation, action, situationIdx, actionIdx };
  }

  if (lang === "en") {
    displayText =
      `【${fromName}】 ➜ 【${toName}】!\n` +
      `${situation},\n` +
      `${action}!`;
    speechText =
      `${fromName}, your target is ${toName}! ${situation}, ${action}!`;
  } else if (lang === "zh") {
    displayText =
      `【${fromName}】➜【${toName}】！\n` +
      `${situation}，\n` +
      `${action}！`;
    speechText =
      `${fromName}，你的對象是${toName}！${situation}，${action}！`;
  } else if (lang === "ko") {
    displayText =
      `【${fromName}】➜【${toName}】!\n` +
      `${situation},\n` +
      `${action}!`;
    speechText =
      `${fromName}, 상대는 ${toName}! ${situation}, ${action}!`;
  } else if (lang === "es") {
    displayText =
      `【${fromName}】 ➜ 【${toName}】!\n` +
      `${situation},\n` +
      `${action}!`;
    speechText =
      `${fromName}, tu objetivo es ${toName}! ${situation}, ${action}!`;
  } else if (lang === "pt") {
    displayText =
      `【${fromName}】 ➜ 【${toName}】!\n` +
      `${situation},\n` +
      `${action}!`;
    speechText =
      `${fromName}, seu alvo é ${toName}! ${situation}, ${action}!`;
  } else if (lang === "vi") {
    displayText =
      `【${fromName}】 ➜ 【${toName}】!\n` +
      `${situation},\n` +
      `${action}!`;
    speechText =
      `${fromName}, mục tiêu của bạn là ${toName}! ${situation}, ${action}!`;
  } else if (lang === "de") {
    displayText =
      `【${fromName}】 ➜ 【${toName}】!\n` +
      `${situation},\n` +
      `${action}!`;
    speechText =
      `${fromName}, dein Ziel ist ${toName}! ${situation}, ${action}!`;
  } else if (lang === "tl") {
    displayText =
      `【${fromName}】 ➜ 【${toName}】!\n` +
      `${situation},\n` +
      `${action}!`;
    speechText =
      `${fromName}, ang target mo ay si ${toName}! ${situation}, ${action}!`;
  } else if (lang === "fr") {
    displayText =
      `【${fromName}】 ➜ 【${toName}】!\n` +
      `${situation},\n` +
      `${action}!`;
    speechText =
      `${fromName}, ta cible est ${toName}! ${situation}, ${action}!`;
  } else if (lang === "th") {
    displayText =
      `【${fromName}】 ➜ 【${toName}】!\n` +
      `${situation},\n` +
      `${action}!`;
    speechText =
      `${fromName} เป้าหมายของคุณคือ ${toName}! ${situation} ${action}!`;
  } else if (lang === "id") {
    displayText =
      `【${fromName}】 ➜ 【${toName}】!\n` +
      `${situation},\n` +
      `${action}!`;
    speechText =
      `${fromName}, targetmu adalah ${toName}! ${situation}, ${action}!`;
  } else {
    // 日本語：名前に「さん」を付けて「から」「へ」がどんな名前でも自然につながるようにする
    displayText =
      `【${fromName}】から【${toName}】へ！\n` +
      `${situation}、\n` +
      `${action}！`;
    speechText =
      `${fromName}さんから、${toName}さんへ！　` +
      `${situation}、${action}！`;
  }

  return {
    displayText,
    speechText: toSpeechSafe(speechText),
    situation,
    action,
    situationIdx,
    actionIdx,
  };
}

/* ---------------------------------------------------------
   朗読（Web Speech API）への最適化
   --------------------------------------------------------- */

// 読み上げで不自然になる記号を、自然な"間"に変換する
function toSpeechSafe(text) {
  return text
    .replace(/（/g, "、")          // 日本語カッコは読点に
    .replace(/）/g, "、")
    .replace(/\s*\(\s*/g, ", ")    // 英語カッコはカンマに
    .replace(/\s*\)\s*/g, ", ")
    .replace(/【|】/g, "")         // 飾りカッコは読まない
    .replace(/、、+/g, "、")       // 読点の重複を整理
    .replace(/\s+,/g, ",")         // カンマ前の空白を除去
    .replace(/,(\s*,)+/g, ",")     // カンマの重複を整理
    .replace(/ {2,}/g, " ")        // 空白の重複を整理
    .replace(/,\s*([!?.])/g, "$1"); // 文末直前の余計なカンマを除去
}

/* ---------------------------------------------------------
   声の性別を見分ける
   端末に入っている声はそれぞれ名前を持っているので、
   代表的な名前から「男性の声か、女性の声か」を判定する。
   --------------------------------------------------------- */
const FEMALE_VOICE_HINTS = [
  "female", "woman", "ayumi", "haruka", "sayaka", "nanami", "kyoko",
  "o-ren", "mizuki", "zira", "jenny", "aria", "samantha", "victoria",
  "eva", "hazel", "susan", "linda", "michelle", "sonia", "natasha",
  "hanhan", "yaoyao", "huihui", "mei-jia", "meijia", "sin-ji", "sinji", "tingting",
  "heami", "sora", "helena", "sabina", "monica", "paulina", "elvira", "laura",
];
const MALE_VOICE_HINTS = [
  "male", "man", "ichiro", "keita", "otoya", "daichi", "show",
  "david", "mark", "guy", "christopher", "daniel", "alex", "fred",
  "george", "james", "ryan", "eric", "william", "liam",
  "zhiwei", "kangkang", "yunjian",
  "injoon", "pablo", "raul", "jorge", "diego", "juan",
];

function classifyVoiceGender(voice) {
  const name = voice.name.toLowerCase();
  if (FEMALE_VOICE_HINTS.some((h) => name.includes(h))) return "female";
  if (MALE_VOICE_HINTS.some((h) => name.includes(h))) return "male";
  return null;
}

// 希望の言語＆性別に一番近い声を選ぶ
function pickVoice(lang, gender) {
  const PREFIX_MAP = { en: "en", zh: "zh", ko: "ko", es: "es", ja: "ja", pt: "pt", vi: "vi", fr: "fr", th: "th", id: "id" };
  const prefix = PREFIX_MAP[lang] || "ja";
  const list = speechSynthesis
    .getVoices()
    .filter((v) => v.lang && v.lang.replace("_", "-").startsWith(prefix));
  if (list.length === 0) return null;
  if (gender) {
    const match = list.find((v) => classifyVoiceGender(v) === gender);
    if (match) return match;
  }
  return list[0];
}

/**
 * お題を朗読する
 * @param {string} speechText - 朗読するテキスト
 * @param {string} lang       - "ja" / "en" / "zh" / "ko" / "es"
 * @param {object} persona    - 声のキャラクター設定（省略可）
 *                              例: { pitch: 0.45, rate: 0.9, gender: "male" }
 * @param {function} onEnd    - 読み上げ完了時に呼ばれるコールバック（省略可。
 *                              非対応ブラウザ・エラー時も含め必ず1回呼ばれる）
 * @param {object} lipSyncHooks - { onBoundary, onStart, onEnd } を渡すと、
 *                              発話に合わせてアバターの口パクを駆動できる
 *                              （省略可。飲み友AIのアバター表示でのみ使用）
 */
function speakOdai(speechText, lang = "ja", persona = null, onEnd, lipSyncHooks) {
  if (!("speechSynthesis" in window)) {
    if (onEnd) onEnd();
    return; // 非対応ブラウザでは何もしない
  }

  speechSynthesis.cancel(); // 前の読み上げが残っていたら止める

  function doSpeak() {
    // 一部のAndroid/Chromeは、止めた直後にすぐ喋らせようとすると
    // 無言のまま失敗することがあるため、ごくわずかに間を空ける
    const utterance = new SpeechSynthesisUtterance(speechText);
    const BCP47_MAP = { en: "en-US", zh: "zh-TW", ko: "ko-KR", es: "es-ES", ja: "ja-JP", pt: "pt-BR", vi: "vi-VN", fr: "fr-FR", th: "th-TH", id: "id-ID" };
    utterance.lang = BCP47_MAP[lang] || "ja-JP";
    utterance.rate = persona && persona.rate ? persona.rate : 1.0;
    utterance.pitch = persona && persona.pitch ? persona.pitch : 1.1;

    const voice = pickVoice(lang, persona ? persona.gender : null);
    if (voice) utterance.voice = voice;

    const hasBgm = typeof BGM !== "undefined";
    // 読み上げ中はBGMを小さくして、声を聞き取りやすくする
    utterance.onstart = () => {
      if (hasBgm) BGM.duck(true);
      if (lipSyncHooks && lipSyncHooks.onStart) lipSyncHooks.onStart();
    };
    if (lipSyncHooks && lipSyncHooks.onBoundary) utterance.onboundary = lipSyncHooks.onBoundary;
    utterance.onend = () => {
      if (hasBgm) BGM.duck(false);
      if (lipSyncHooks && lipSyncHooks.onEnd) lipSyncHooks.onEnd();
      if (onEnd) onEnd();
    };
    utterance.onerror = () => {
      if (hasBgm) BGM.duck(false);
      if (lipSyncHooks && lipSyncHooks.onEnd) lipSyncHooks.onEnd();
      if (onEnd) onEnd();
    };

    // 稀に「一時停止」状態のまま固まる端末があるための保険
    if (speechSynthesis.paused) speechSynthesis.resume();
    speechSynthesis.speak(utterance);
  }

  setTimeout(doSpeak, 60);
}

// 一部のスマホは音声リストが後から非同期に届くため、
// 届いたタイミングで声の候補を最新化しておく
if ("speechSynthesis" in window && "onvoiceschanged" in speechSynthesis) {
  speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
}

// iOS Safari等は「ユーザーの操作の中で直接呼ばれた読み上げ」しか
// 声を出さない制限があるため、最初のタップの瞬間に無音の発話を1回
// 送っておくことで、後から遅れて呼ばれる読み上げも解禁される
function unlockSpeech() {
  if (!("speechSynthesis" in window)) return;
  const silent = new SpeechSynthesisUtterance(" ");
  silent.volume = 0;
  speechSynthesis.speak(silent);
}
