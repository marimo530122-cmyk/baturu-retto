/* =========================================================
   バツルーレット - ゲーム本体
   ・ワンクリック完結ルーレット（1回で全部決まる）
   ・👑王様モード（10%の確率で発動）
   ・日本語／英語 切り替え
   （お題の生成は odai-generator.js が担当）
   ========================================================= */

/* ---------------- 王様モードの発動確率 ---------------- */
const KING_CHANCE = 0.10; // 10%

/* ---------------- 表彰式の間隔 ---------------- */
const CEREMONY_INTERVAL = 10; // 10ラウンドごとに表彰式

/* ---------------- 言語の切り替え順番 ---------------- */
const LANG_CYCLE = ["ja", "en", "zh", "ko", "es", "pt"];
const LANG_LABELS = { ja: "日", en: "EN", zh: "中", ko: "한", es: "ES", pt: "PT" };

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

/* ---------------- 状態（ゲームの記憶） ---------------- */
const state = {
  lang: "ja",          // "ja"日本語 / "en"英語 / "zh"繁體中文 / "ko"한국어 / "es"español
  mode: "mf",          // "mf" = 男女に分ける / "all" = 全員一緒
  men: [],
  women: [],
  everyone: [],
  currentSpeech: null, // 「もう一度読み上げ」用
  currentPair: null,   // パス用（同じ2人でお題だけ変える）
  isKing: false,
  voicePersona: "random", // 声のキャラクター（random / mc / oyaji / girl）
  currentVoice: null,     // 今回の読み上げに使った声（もう一度読み上げ用）
  roundCount: 0,       // これまでに終わったラウンド数（表彰の判定に使う）
  stats: {},           // 名前 -> { king: 王様になった回数, challenge: お題をやった回数 }
  pendingCeremony: false, // 次の「次のルーレットへ」で表彰画面を挟むかどうか
  theme: "neon",       // "neon" / "casino" / "izakaya"（🎨着せ替え・有料機能）
  riggedName: null,    // 🃏イカサマモードで仕込んだ名前（次の1回だけ有効）
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

/* ---------------- 日本語／英語の文言集 ---------------- */
const UI = {
  ja: {
    langName: "日本語",
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
      theme: "🎨 ルーレットの着せ替え",
      rig: "🃏 イカサマモード",
      romance: "💌 恋愛パック",
      online: "📡 オンラインモード",
      post: "📮 罰ゲーム投稿・共有",
    },
    themes: { neon: "🌃 ネオン", casino: "🎰 カジノ", izakaya: "🏮 居酒屋" },
    rigTitle: "🃏 イカサマモード",
    rigDesc: "次のルーレット、当たりやすくする人を選んでください",
    rigClear: "解除する",
    rigSet: (name) => `次のルーレット、【${name}】が当たりやすくなります！`,
    rigOff: "イカサマを解除しました",
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
    spiceLabel: "🌶️ お色気レベル",
    spiceLocked: "レベル3以上は有料版で解放されます。",
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
    spinTaunt: "😈 だれだ…！？",
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
    share: "📤 シェア",
    shareCopied: "リンクをコピーしました！",
    copyShareTitle: "📋 コピーしました！",
    copyShareText: (app) => `シェア文章をコピーしました！${app}が開いたらそのまま貼り付けて投稿してね！`,
    copyShareOpen: (app) => `${app}を開く`,
    copyShareClose: "あとで",
    shareAppText: "🎰 バツルーレット - 飲み会を爆上げする罰ゲームルーレット！",
    shareOdaiText: (text) => text, // 個人間のチャット共有はハッシュタグなし（Xシェアは別途 shareToX() で付与）
    shareOnX: "𝕏でシェア",
    next: "🎰 次のルーレットへ！",
    ceremonyTitle: (n) => `🏆 中間結果発表！（${n}回終了）`,
    ceremonyKing: (name, count) => `👑 王様運No.1：【${name}】（${count}回）`,
    ceremonyChallenge: (name, count) => `🎯 被弾大賞：【${name}】（${count}回）`,
    ceremonyNoKing: "👑 まだ王様は誕生していません",
    ceremonyContinue: "🎉 続ける",
    bgmGenres: { jazz: "🎷 ジャズ", edm: "🎧 EDM", enka: "🎤 演歌" },
    romanceOn: "💌 恋愛パックに切り替えました",
    romanceOff: "🎲 通常パックに戻しました",
    adultOn: "🔞 大人向けパックに切り替えました",
    adultOff: "🎲 通常パックに戻しました",
    agegateTitle: "🔞 年齢確認",
    agegateDesc: "大人向けパックには、恋人・パートナー間の軽いスキンシップを含むお題があります。18歳以上の方のみお進みください。",
    agegateYes: "18歳以上です",
    agegateNo: "やめておく",
    upgradeBtn: "💎 いますぐアップグレード",
    upgradeNotConfigured: "決済の準備中です。もうしばらくお待ちください。",
    unlockedTitle: "✨ 有料版が有効になりました！",
    unlockedDesc: "ご購入ありがとうございます！大人向けパック・イカサマモード・着せ替えテーマなど、有料コンテンツが全て解放されました。乾杯🍻",
    unlockedClose: "はじめる",
    subTitle: "📮 罰ゲーム投稿・共有",
    subDesc: "あなたが考えたオリジナルの罰ゲームを投稿できます。自動審査＋確認を経てから、他のユーザーに共有されます（個人情報や誹謗中傷は含めないでください）。",
    subPlaceholder: "例：好きな芸能人のモノマネをする",
    subPostBtn: "投稿する",
    subListTitle: "🌟 みんなの投稿",
    subEmpty: "まだ投稿がありません。最初の投稿者になりませんか？",
    subSpeak: "🔊 読み上げる",
    subReport: "🚩 通報",
    subClose: "とじる",
    subPostedPending: "投稿しました！審査後、みんなに共有されます。",
    subRejectedNgWord: "ごめんなさい、この内容は投稿できません（不適切な表現が含まれています）。",
    subRejectedEmpty: "罰ゲームの内容を入力してください。",
    subRejectedTooLong: `200文字以内で入力してください。`,
    subNotConfigured: "投稿・共有機能の設定がまだ完了していません。",
    subReported: "通報しました。ご協力ありがとうございます。",
    adminTitle: "🛡️ 承認待ちの投稿",
    adminApprove: "✅ 承認",
    adminReject: "❌ 却下",
    adminEmpty: "審査待ちの投稿はありません。",
    adminClose: "とじる",
    achTitle: "🏆 実績バッジ",
    achClose: "とじる",
    achUnlocked: (name) => `🏅 実績解除：${name}！`,
    hlTitle: "📸 今夜のハイライト",
    hlEmpty: "まだハイライトがありません。お題が発表されると自動で記録されます。",
    hlClose: "とじる",
    onlineTitle: "📡 オンライン飲み会モード",
    onlineDesc: "Zoom等で画面を見せながら、離れた場所のみんなと一緒に遊べます",
    onlineCreateBtn: "🖥️ 部屋を作る（幹事）",
    onlineJoinPlaceholder: "4桁のコード",
    onlineJoinBtn: "参加する",
    onlineClose: "とじる",
    onlineNotConfigured: "オンライン機能の設定がまだ完了していません。要件定義書の「オンラインモードの設定方法」をご確認ください。",
    onlineRoomCreated: (code) => `部屋を作成しました！コード「${code}」をZoom等のチャットで参加者に共有してください。`,
    onlineInvalidCode: "コードを4桁で入力してください",
    onlineJoinFailed: "その部屋が見つかりませんでした",
    onlineGuestTitle: "📡 待機中…",
    onlineGuestWaiting: (code) => `ルームコード：${code}\nホストがルーレットを回すのを待っています…`,
    onlineHostBadge: (code) => `📡 ルーム: ${code}（参加者にはこのコードを共有）`,
    onlineLeave: "← 退出する",
  },
  en: {
    langName: "English",
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
      theme: "🎨 Roulette Themes",
      rig: "🃏 Rig Mode",
      romance: "💌 Romance Pack",
      online: "📡 Online Mode",
      post: "📮 Post & Share Dares",
    },
    themes: { neon: "🌃 Neon", casino: "🎰 Casino", izakaya: "🏮 Izakaya" },
    rigTitle: "🃏 Rig Mode",
    rigDesc: "Pick who should be more likely to win the next spin",
    rigClear: "Clear",
    rigSet: (name) => `【${name}】 is now more likely to win the next spin!`,
    rigOff: "Rig mode cleared",
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
    spiceLabel: "🌶️ Spice Level",
    spiceLocked: "Level 3 and up are unlocked in the premium version.",
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
    spinTaunt: "😈 Who will it be...!?",
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
    share: "📤 Share",
    shareCopied: "Link copied!",
    copyShareTitle: "📋 Copied!",
    copyShareText: (app) => `Your share text is copied! Once ${app} opens, just paste it and post!`,
    copyShareOpen: (app) => `Open ${app}`,
    copyShareClose: "Later",
    shareAppText: "🎰 Batsu Roulette - the ultimate party dare game!",
    shareOdaiText: (text) => text, // no hashtags for 1:1 chat shares (X sharing adds hashtags separately via shareToX())
    shareOnX: "Share on 𝕏",
    next: "🎰 NEXT SPIN!",
    ceremonyTitle: (n) => `🏆 RESULTS SO FAR! (${n} rounds)`,
    ceremonyKing: (name, count) => `👑 King of the Night: 【${name}】 (${count}x)`,
    ceremonyChallenge: (name, count) => `🎯 Most Challenges: 【${name}】 (${count}x)`,
    ceremonyNoKing: "👑 No King has appeared yet",
    ceremonyContinue: "🎉 Continue",
    bgmGenres: { jazz: "🎷 Jazz", edm: "🎧 EDM", enka: "🎤 Enka" },
    romanceOn: "💌 Switched to Romance Pack",
    romanceOff: "🎲 Switched back to Standard Pack",
    adultOn: "🔞 Switched to Adults Only Pack",
    adultOff: "🎲 Switched back to Standard Pack",
    agegateTitle: "🔞 Age Verification",
    agegateDesc: "The Adults Only pack includes challenges with light physical affection between partners. Please continue only if you are 18 or older.",
    agegateYes: "I'm 18 or older",
    agegateNo: "Never mind",
    upgradeBtn: "💎 Upgrade Now",
    upgradeNotConfigured: "Payments aren't set up yet. Please check back soon.",
    unlockedTitle: "✨ Premium Unlocked!",
    unlockedDesc: "Thanks for your purchase! All premium content — the Adults Only pack, Rig Mode, roulette themes, and more — is now unlocked. Cheers! 🍻",
    unlockedClose: "Let's go",
    subTitle: "📮 Post & Share Dares",
    subDesc: "Submit an original dare you came up with. After passing automatic screening and review, it'll be shared with other users (please don't include personal info or insults).",
    subPlaceholder: "e.g. do an impression of your favorite celebrity",
    subPostBtn: "Submit",
    subListTitle: "🌟 Community Dares",
    subEmpty: "No submissions yet. Be the first!",
    subSpeak: "🔊 Read aloud",
    subReport: "🚩 Report",
    subClose: "Close",
    subPostedPending: "Submitted! It'll be shared with everyone after review.",
    subRejectedNgWord: "Sorry, this can't be posted (it contains inappropriate content).",
    subRejectedEmpty: "Please enter a dare.",
    subRejectedTooLong: "Please keep it under 200 characters.",
    subNotConfigured: "The posting & sharing feature isn't set up yet.",
    subReported: "Reported. Thanks for helping keep things safe.",
    adminTitle: "🛡️ Pending Submissions",
    adminApprove: "✅ Approve",
    adminReject: "❌ Reject",
    adminEmpty: "No submissions awaiting review.",
    adminClose: "Close",
    achTitle: "🏆 Achievements",
    achClose: "Close",
    achUnlocked: (name) => `🏅 Achievement unlocked: ${name}!`,
    hlTitle: "📸 Tonight's Highlights",
    hlEmpty: "No highlights yet. They're saved automatically when a challenge is revealed.",
    hlClose: "Close",
    onlineTitle: "📡 Online Party Mode",
    onlineDesc: "Play together with people in other locations, e.g. over a Zoom call",
    onlineCreateBtn: "🖥️ Create Room (Host)",
    onlineJoinPlaceholder: "4-digit code",
    onlineJoinBtn: "Join",
    onlineClose: "Close",
    onlineNotConfigured: "Online mode isn't set up yet. See \"Online Mode Setup\" in the requirements doc.",
    onlineRoomCreated: (code) => `Room created! Share code "${code}" with your friends over Zoom chat, etc.`,
    onlineInvalidCode: "Please enter a 4-digit code",
    onlineJoinFailed: "That room could not be found",
    onlineGuestTitle: "📡 Waiting…",
    onlineGuestWaiting: (code) => `Room code: ${code}\nWaiting for the host to spin the wheel…`,
    onlineHostBadge: (code) => `📡 Room: ${code} (share this code with guests)`,
    onlineLeave: "← Leave",
  },
  zh: {
    langName: "繁體中文",
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
      theme: "🎨 輪盤換裝",
      rig: "🃏 作弊模式",
      romance: "💌 戀愛套組",
      online: "📡 線上模式",
      post: "📮 罰遊戲投稿・分享",
    },
    themes: { neon: "🌃 霓虹", casino: "🎰 賭場", izakaya: "🏮 居酒屋" },
    rigTitle: "🃏 作弊模式",
    rigDesc: "選擇下一輪比較容易被抽中的人",
    rigClear: "解除",
    rigSet: (name) => `下一輪，【${name}】會比較容易被抽中！`,
    rigOff: "已解除作弊設定",
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
    spiceLabel: "🌶️ 辣度等級",
    spiceLocked: "等級3以上須付費版才能解鎖。",
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
    spinTaunt: "😈 會是誰呢…！？",
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
    share: "📤 分享",
    shareCopied: "已複製連結！",
    copyShareTitle: "📋 已複製！",
    copyShareText: (app) => `分享文字已複製！打開${app}後直接貼上發佈吧！`,
    copyShareOpen: (app) => `開啟${app}`,
    copyShareClose: "稍後",
    shareAppText: "🎰 罰遊戲輪盤 - 讓聚會爆棚的懲罰遊戲轉盤！",
    shareOdaiText: (text) => text, // 一對一聊天分享不附加標籤（X分享另由shareToX()附加）
    shareOnX: "在𝕏分享",
    next: "🎰 下一輪！",
    ceremonyTitle: (n) => `🏆 目前戰績發表！（已進行${n}輪）`,
    ceremonyKing: (name, count) => `👑 國王運第一名：【${name}】（${count}次）`,
    ceremonyChallenge: (name, count) => `🎯 中獎大王：【${name}】（${count}次）`,
    ceremonyNoKing: "👑 目前還沒有國王誕生",
    ceremonyContinue: "🎉 繼續遊戲",
    bgmGenres: { jazz: "🎷 爵士", edm: "🎧 電音", enka: "🎤 演歌" },
    romanceOn: "💌 已切換為戀愛套組",
    romanceOff: "🎲 已切回標準套組",
    adultOn: "🔞 已切換為成人限定套組",
    adultOff: "🎲 已切回標準套組",
    agegateTitle: "🔞 年齡確認",
    agegateDesc: "成人限定套組包含伴侶間輕度親密接觸的題目。請確認您已年滿18歲再繼續。",
    agegateYes: "我已年滿18歲",
    agegateNo: "先不要",
    upgradeBtn: "💎 立即升級",
    upgradeNotConfigured: "付款功能尚未設定完成，請稍候再試。",
    unlockedTitle: "✨ 付費版已啟用！",
    unlockedDesc: "感謝您的購買！成人限定套組、作弊模式、輪盤換裝等所有付費內容現已全部解鎖。乾杯🍻",
    unlockedClose: "開始",
    subTitle: "📮 罰遊戲投稿・分享",
    subDesc: "您可以投稿自己想的原創罰遊戲。經過自動審查與確認後，會分享給其他使用者（請勿包含個人資訊或誹謗中傷內容）。",
    subPlaceholder: "例：模仿喜歡的藝人",
    subPostBtn: "投稿",
    subListTitle: "🌟 大家的投稿",
    subEmpty: "還沒有投稿。要不要成為第一位投稿者？",
    subSpeak: "🔊 朗讀",
    subReport: "🚩 檢舉",
    subClose: "關閉",
    subPostedPending: "已投稿！審核後將分享給大家。",
    subRejectedNgWord: "抱歉，此內容無法投稿（包含不適當的表現）。",
    subRejectedEmpty: "請輸入罰遊戲的內容。",
    subRejectedTooLong: "請在200字以內輸入。",
    subNotConfigured: "投稿・分享功能尚未設定完成。",
    subReported: "已檢舉，感謝您的協助。",
    adminTitle: "🛡️ 審核中的投稿",
    adminApprove: "✅ 核准",
    adminReject: "❌ 駁回",
    adminEmpty: "目前沒有待審核的投稿。",
    adminClose: "關閉",
    achTitle: "🏆 成就徽章",
    achClose: "關閉",
    achUnlocked: (name) => `🏅 解鎖成就：${name}！`,
    hlTitle: "📸 今晚的精彩瞬間",
    hlEmpty: "還沒有精彩瞬間，題目公布時會自動記錄。",
    hlClose: "關閉",
    onlineTitle: "📡 線上聚會模式",
    onlineDesc: "一邊開Zoom等視訊，一邊和不同地點的大家一起玩",
    onlineCreateBtn: "🖥️ 建立房間（主持人）",
    onlineJoinPlaceholder: "4位數房號",
    onlineJoinBtn: "加入",
    onlineClose: "關閉",
    onlineNotConfigured: "線上功能尚未設定完成，請參考需求文件中的「線上模式設定方法」。",
    onlineRoomCreated: (code) => `房間已建立！請把房號「${code}」透過Zoom聊天室分享給大家。`,
    onlineInvalidCode: "請輸入4位數房號",
    onlineJoinFailed: "找不到這個房間",
    onlineGuestTitle: "📡 等待中…",
    onlineGuestWaiting: (code) => `房號：${code}\n正在等待主持人轉動輪盤…`,
    onlineHostBadge: (code) => `📡 房間: ${code}（請分享給參加者）`,
    onlineLeave: "← 離開",
  },
  ko: {
    langName: "한국어",
    sub: "회식을 뜨겁게 달구는",
    logoHTML: '바츠<span class="neon-purple">룰렛</span>',
    tag: "2,500가지 벌칙 × 👑왕게임 모드 × MC 보이스",
    free: "＼ 지금 바로 무료로 즐기기！ ／",
    start: "🎰 시작하기",
    premiumHeading: "✨ 프리미엄（준비중）",
    packs: {
      adult: "🔞 성인 전용",
      family: "👨‍👩‍👧 가족 모드",
      couple: "💑 커플 모드",
      theme: "🎨 룰렛 테마 변경",
      rig: "🃏 조작 모드",
      romance: "💌 로맨스 팩",
      online: "📡 온라인 모드",
      post: "📮 벌칙 투고・공유",
    },
    themes: { neon: "🌃 네온", casino: "🎰 카지노", izakaya: "🏮 이자카야" },
    rigTitle: "🃏 조작 모드",
    rigDesc: "다음 룰렛에서 당첨되기 쉽게 만들 사람을 선택하세요",
    rigClear: "해제하기",
    rigSet: (name) => `다음 룰렛에서【${name}】이(가) 당첨되기 쉬워집니다!`,
    rigOff: "조작 설정이 해제되었습니다",
    noticeHTML: "※미성년자 음주는 법으로 금지되어 있습니다.<br>음주나 벌칙을 강요하지 마세요.",
    setupTitle: "참가자 등록",
    modeMf: "남녀로 나누기",
    modeAll: "다 같이",
    teamM: "♂ 남자팀",
    teamF: "♀ 여자팀",
    teamA: "🍻 참가자",
    placeholder: "이름을 입력하세요",
    add: "추가",
    gameStart: "🎲 게임 시작！",
    backTitle: "← 타이틀로 돌아가기",
    backSetup: "← 참가자 변경",
    msgDup: "이미 등록된 이름입니다",
    msgMax: "최대 12명까지 등록할 수 있습니다",
    msgNeedMf: "남자·여자 각 1명 이상, 총 3명 이상 등록해주세요",
    msgNeedAll: "3명 이상 등록해주세요",
    coupleTeaser: "단둘이라면 「커플 모드」 추천! 프리미엄 콘텐츠입니다.",
    packTeaser: (packName) => `「${packName}」은 프리미엄 콘텐츠입니다.`,
    spiceLabel: "🌶️ 매콤 레벨",
    spiceLocked: "레벨 3부터는 프리미엄 버전에서 해제됩니다.",
    modalTitle: "✨ 프리미엄 안내 ✨",
    modalPrice: "일회성 결제 ₩3,900（현재 준비중입니다. 기대해주세요！）",
    modalClose: "닫기",
    voices: {
      random: "🎲 무작위 목소리（매번 바뀜）",
      mc: "🎤 표준 MC",
      oyaji: "👨 중후한 아저씨 목소리",
      girl: "👧 귀여운 여자 목소리",
    },
    voiceSample: {
      mc: "제가 읽어드릴게요!",
      oyaji: "내가 읽어주지.",
      girl: "제가 읽을게요!",
    },
    bgmOn: "🎷 재즈 BGM 켜짐",
    bgmOff: "🎷 재즈 BGM 꺼짐",
    statusStart: "🎯 벌칙을 받을 사람은…！？",
    spinTaunt: "😈 누구일까…！？",
    spinBtn: "🎰 룰렛 시작！",
    statusPicked: (name) => `당첨은…【${name}】!`,
    statusOdai: "🔥 벌칙 공개！",
    statusKing: "👑 왕 탄생！！",
    kingCard: (name) =>
      `👑 왕 탄생！！\n\n왕은【${name}】!\n\n왕의 명령은 절대적！\n모두에게 자유롭게 명령을 내려보세요！`,
    kingSpeech: (name) =>
      `왕은, ${name}! 왕의 명령은 절대적! 자유롭게 명령을 내려주세요!`,
    speak: "🔊 다시 듣기",
    pass: "🔄 패스（다른 벌칙으로）",
    share: "📤 공유",
    shareCopied: "링크가 복사되었습니다!",
    copyShareTitle: "📋 복사했습니다!",
    copyShareText: (app) => `공유 문구를 복사했어요! ${app}이(가) 열리면 그대로 붙여넣고 게시해 주세요!`,
    copyShareOpen: (app) => `${app} 열기`,
    copyShareClose: "나중에",
    shareAppText: "🎰 벌칙 룰렛 - 회식을 뜨겁게 달구는 벌칙 게임!",
    shareOdaiText: (text) => text, // 1:1 채팅 공유는 해시태그 없음（X 공유는 shareToX()에서 별도로 추가）
    shareOnX: "𝕏에 공유하기",
    next: "🎰 다음 룰렛으로！",
    ceremonyTitle: (n) => `🏆 중간 결과 발표！（${n}회 종료）`,
    ceremonyKing: (name, count) => `👑 왕 운 1위：【${name}】（${count}회）`,
    ceremonyChallenge: (name, count) => `🎯 당첨왕：【${name}】（${count}회）`,
    ceremonyNoKing: "👑 아직 왕이 탄생하지 않았습니다",
    ceremonyContinue: "🎉 계속하기",
    bgmGenres: { jazz: "🎷 재즈", edm: "🎧 EDM", enka: "🎤 엔카" },
    romanceOn: "💌 로맨스 팩으로 전환했습니다",
    romanceOff: "🎲 기본 팩으로 되돌렸습니다",
    adultOn: "🔞 성인 전용 팩으로 전환했습니다",
    adultOff: "🎲 기본 팩으로 되돌렸습니다",
    agegateTitle: "🔞 연령 확인",
    agegateDesc: "성인 전용 팩에는 연인·파트너 사이의 가벼운 스킨십이 포함된 미션이 있습니다. 18세 이상만 진행해주세요.",
    agegateYes: "18세 이상입니다",
    agegateNo: "그만두기",
    upgradeBtn: "💎 지금 업그레이드",
    upgradeNotConfigured: "결제 기능을 준비 중입니다. 조금만 기다려주세요.",
    unlockedTitle: "✨ 프리미엄이 활성화되었습니다!",
    unlockedDesc: "구매해주셔서 감사합니다! 성인 전용 팩·조작 모드·룰렛 테마 변경 등 모든 프리미엄 콘텐츠가 해제되었습니다. 건배🍻",
    unlockedClose: "시작하기",
    subTitle: "📮 벌칙 투고・공유",
    subDesc: "직접 생각한 오리지널 벌칙을 투고할 수 있습니다. 자동 심사와 확인을 거친 후 다른 사용자와 공유됩니다（개인정보나 비방은 포함하지 말아주세요）.",
    subPlaceholder: "예：좋아하는 연예인 성대모사하기",
    subPostBtn: "투고하기",
    subListTitle: "🌟 모두의 투고",
    subEmpty: "아직 투고가 없습니다. 첫 투고자가 되어보세요！",
    subSpeak: "🔊 읽어주기",
    subReport: "🚩 신고",
    subClose: "닫기",
    subPostedPending: "투고했습니다! 심사 후 모두에게 공유됩니다.",
    subRejectedNgWord: "죄송합니다, 이 내용은 투고할 수 없습니다（부적절한 표현이 포함되어 있습니다）.",
    subRejectedEmpty: "벌칙 내용을 입력해주세요.",
    subRejectedTooLong: "200자 이내로 입력해주세요.",
    subNotConfigured: "투고・공유 기능이 아직 설정되지 않았습니다.",
    subReported: "신고했습니다. 협조해주셔서 감사합니다.",
    adminTitle: "🛡️ 심사 대기 중인 투고",
    adminApprove: "✅ 승인",
    adminReject: "❌ 거부",
    adminEmpty: "심사 대기 중인 투고가 없습니다.",
    adminClose: "닫기",
    achTitle: "🏆 업적 배지",
    achClose: "닫기",
    achUnlocked: (name) => `🏅 업적 달성: ${name}!`,
    hlTitle: "📸 오늘 밤의 하이라이트",
    hlEmpty: "아직 하이라이트가 없습니다. 벌칙이 발표되면 자동으로 기록됩니다.",
    hlClose: "닫기",
    onlineTitle: "📡 온라인 파티 모드",
    onlineDesc: "Zoom 등으로 화면을 보여주면서 멀리 있는 사람들과 함께 즐길 수 있어요",
    onlineCreateBtn: "🖥️ 방 만들기 (호스트)",
    onlineJoinPlaceholder: "4자리 코드",
    onlineJoinBtn: "참가하기",
    onlineClose: "닫기",
    onlineNotConfigured: "온라인 기능이 아직 설정되지 않았습니다. 요건정의서의 '온라인 모드 설정 방법'을 확인해주세요.",
    onlineRoomCreated: (code) => `방이 생성되었습니다! 코드 "${code}"를 Zoom 채팅 등으로 참가자에게 공유하세요.`,
    onlineInvalidCode: "코드를 4자리로 입력해주세요",
    onlineJoinFailed: "해당 방을 찾을 수 없습니다",
    onlineGuestTitle: "📡 대기 중…",
    onlineGuestWaiting: (code) => `방 코드: ${code}\n호스트가 룰렛을 돌리기를 기다리는 중…`,
    onlineHostBadge: (code) => `📡 방: ${code} (참가자에게 공유하세요)`,
    onlineLeave: "← 나가기",
  },
  es: {
    langName: "Español",
    sub: "La chispa de toda fiesta",
    logoHTML: 'Batsu <span class="neon-purple">Ruleta</span>',
    tag: "2.500 retos × 👑 Modo Rey × Voz de presentador",
    free: "＼ ¡Juega GRATIS ahora mismo! ／",
    start: "🎰 JUGAR",
    premiumHeading: "✨ Versión Premium (próximamente)",
    packs: {
      adult: "🔞 Solo Adultos",
      family: "👨‍👩‍👧 Familiar",
      couple: "💑 Modo Pareja",
      theme: "🎨 Temas de la Ruleta",
      rig: "🃏 Modo Amañado",
      romance: "💌 Paquete Romántico",
      online: "📡 Modo Online",
      post: "📮 Publicar y Compartir Retos",
    },
    themes: { neon: "🌃 Neón", casino: "🎰 Casino", izakaya: "🏮 Izakaya" },
    rigTitle: "🃏 Modo Amañado",
    rigDesc: "Elige quién tendrá más probabilidad de ganar el próximo giro",
    rigClear: "Quitar",
    rigSet: (name) => `¡【${name}】 ahora tiene más probabilidad de ganar el próximo giro!`,
    rigOff: "Modo amañado desactivado",
    noticeHTML: "Bebe con responsabilidad y solo si tienes la edad legal.<br>Nunca obligues a nadie a beber o hacer un reto.",
    setupTitle: "Agregar Jugadores",
    modeMf: "Chicos vs Chicas",
    modeAll: "Todos juntos",
    teamM: "♂ Equipo Chicos",
    teamF: "♀ Equipo Chicas",
    teamA: "🍻 Jugadores",
    placeholder: "Escribe un nombre",
    add: "Agregar",
    gameStart: "🎲 ¡EMPEZAR!",
    backTitle: "← Volver al inicio",
    backSetup: "← Cambiar jugadores",
    msgDup: "Ese nombre ya está registrado",
    msgMax: "Puedes registrar hasta 12 jugadores",
    msgNeedMf: "Agrega al menos 1 chico, 1 chica y 3 jugadores en total",
    msgNeedAll: "Agrega al menos 3 jugadores",
    coupleTeaser: "¿Solo ustedes dos? ¡Prueba el Modo Pareja! Es contenido premium.",
    packTeaser: (packName) => `"${packName}" es contenido de la versión premium.`,
    spiceLabel: "🌶️ Nivel de Picante",
    spiceLocked: "El nivel 3 en adelante se desbloquea en la versión premium.",
    modalTitle: "✨ Versión Premium ✨",
    modalPrice: "Pago único €3.49 / MX$29 (¡próximamente!)",
    modalClose: "Cerrar",
    voices: {
      random: "🎲 Voz sorpresa (cambia cada vez)",
      mc: "🎤 Presentador estándar",
      oyaji: "👨 Voz grave de señor",
      girl: "👧 Voz de chica tierna",
    },
    voiceSample: {
      mc: "¡Yo leeré los retos!",
      oyaji: "Yo los leeré por ustedes.",
      girl: "¡Yo los leo, vamos!",
    },
    bgmOn: "🎷 Música jazz ACTIVADA",
    bgmOff: "🎷 Música jazz DESACTIVADA",
    statusStart: "🎯 ¿Quién recibirá el reto...!?",
    spinTaunt: "😈 ¿Quién será...!?",
    spinBtn: "🎰 ¡GIRAR LA RULETA!",
    statusPicked: (name) => `¡Es... 【${name}】!`,
    statusOdai: "🔥 ¡AQUÍ ESTÁ EL RETO!",
    statusKing: "👑 ¡TODOS ANTE EL REY!",
    kingCard: (name) =>
      `👑 ¡TODOS ANTE EL REY!\n\n¡El Rey es 【${name}】!\n\n¡La orden del Rey es absoluta!\n¡Inventa el reto que quieras!`,
    kingSpeech: (name) =>
      `¡El Rey es ${name}! ¡La orden del Rey es absoluta! ¡Inventa el reto que quieras!`,
    speak: "🔊 Leer de nuevo",
    pass: "🔄 Pasar (nuevo reto)",
    share: "📤 Compartir",
    shareCopied: "¡Enlace copiado!",
    copyShareTitle: "📋 ¡Copiado!",
    copyShareText: (app) => `¡Tu texto para compartir fue copiado! En cuanto se abra ${app}, solo pégalo y publícalo!`,
    copyShareOpen: (app) => `Abrir ${app}`,
    copyShareClose: "Después",
    shareAppText: "🎰 Batsu Roulette - ¡el juego de retos definitivo para fiestas!",
    shareOdaiText: (text) => text, // sin hashtags para chats 1:1 (los hashtags de X se añaden en shareToX())
    shareOnX: "Compartir en 𝕏",
    next: "🎰 ¡SIGUIENTE!",
    ceremonyTitle: (n) => `🏆 ¡RESULTADOS HASTA AHORA! (${n} rondas)`,
    ceremonyKing: (name, count) => `👑 Rey de la noche: 【${name}】 (${count}x)`,
    ceremonyChallenge: (name, count) => `🎯 Más retos: 【${name}】 (${count}x)`,
    ceremonyNoKing: "👑 Todavía no ha aparecido ningún Rey",
    ceremonyContinue: "🎉 Continuar",
    bgmGenres: { jazz: "🎷 Jazz", edm: "🎧 EDM", enka: "🎤 Enka" },
    romanceOn: "💌 Cambiado al Paquete Romántico",
    romanceOff: "🎲 Vuelto al paquete estándar",
    adultOn: "🔞 Cambiado al Paquete Solo Adultos",
    adultOff: "🎲 Vuelto al paquete estándar",
    agegateTitle: "🔞 Verificación de edad",
    agegateDesc: "El paquete Solo Adultos incluye retos con contacto físico ligero entre parejas. Continúa solo si tienes 18 años o más.",
    agegateYes: "Tengo 18 años o más",
    agegateNo: "Mejor no",
    upgradeBtn: "💎 Actualizar ahora",
    upgradeNotConfigured: "Los pagos aún no están configurados. Vuelve a intentarlo pronto.",
    unlockedTitle: "✨ ¡Versión Premium Activada!",
    unlockedDesc: "¡Gracias por tu compra! Todo el contenido premium — el Paquete Solo Adultos, Modo Amañado, temas de la ruleta y más — ya está desbloqueado. ¡Salud! 🍻",
    unlockedClose: "Empezar",
    subTitle: "📮 Publicar y Compartir Retos",
    subDesc: "Envía un reto original que se te haya ocurrido. Tras pasar la revisión automática y la confirmación, se compartirá con otros usuarios (no incluyas información personal ni insultos).",
    subPlaceholder: "ej: imita a tu famoso favorito",
    subPostBtn: "Enviar",
    subListTitle: "🌟 Retos de la Comunidad",
    subEmpty: "Aún no hay envíos. ¡Sé el primero!",
    subSpeak: "🔊 Leer en voz alta",
    subReport: "🚩 Reportar",
    subClose: "Cerrar",
    subPostedPending: "¡Enviado! Se compartirá con todos después de la revisión.",
    subRejectedNgWord: "Lo sentimos, esto no se puede publicar (contiene contenido inapropiado).",
    subRejectedEmpty: "Por favor escribe un reto.",
    subRejectedTooLong: "Por favor, no superes los 200 caracteres.",
    subNotConfigured: "La función de publicar y compartir aún no está configurada.",
    subReported: "Reportado. Gracias por tu ayuda.",
    adminTitle: "🛡️ Envíos Pendientes",
    adminApprove: "✅ Aprobar",
    adminReject: "❌ Rechazar",
    adminEmpty: "No hay envíos pendientes de revisión.",
    adminClose: "Cerrar",
    achTitle: "🏆 Logros",
    achClose: "Cerrar",
    achUnlocked: (name) => `🏅 ¡Logro desbloqueado: ${name}!`,
    hlTitle: "📸 Momentos de esta noche",
    hlEmpty: "Aún no hay momentos guardados. Se guardan automáticamente al revelar un reto.",
    hlClose: "Cerrar",
    onlineTitle: "📡 Modo Fiesta Online",
    onlineDesc: "Juega junto a personas en otros lugares, por ejemplo en una llamada de Zoom",
    onlineCreateBtn: "🖥️ Crear sala (anfitrión)",
    onlineJoinPlaceholder: "Código de 4 dígitos",
    onlineJoinBtn: "Unirse",
    onlineClose: "Cerrar",
    onlineNotConfigured: "El modo online aún no está configurado. Consulta \"Configuración del modo online\" en el documento de requisitos.",
    onlineRoomCreated: (code) => `¡Sala creada! Comparte el código "${code}" con tus amigos por el chat de Zoom, etc.`,
    onlineInvalidCode: "Por favor ingresa un código de 4 dígitos",
    onlineJoinFailed: "No se pudo encontrar esa sala",
    onlineGuestTitle: "📡 Esperando…",
    onlineGuestWaiting: (code) => `Código de sala: ${code}\nEsperando a que el anfitrión gire la ruleta…`,
    onlineHostBadge: (code) => `📡 Sala: ${code} (comparte este código con los invitados)`,
    onlineLeave: "← Salir",
  },
  pt: {
    langName: "Português",
    sub: "O jogo que agita qualquer festa",
    logoHTML: 'Batsu <span class="neon-purple">Roleta</span>',
    tag: "2.500 desafios × 👑 Modo Rei × Voz de apresentador",
    free: "＼ Jogue GRÁTIS agora mesmo! ／",
    start: "🎰 JOGAR",
    premiumHeading: "✨ Versão Premium (em breve)",
    packs: {
      adult: "🔞 Somente Adultos",
      family: "👨‍👩‍👧 Família",
      couple: "💑 Modo Casal",
      theme: "🎨 Temas da Roleta",
      rig: "🃏 Modo Manipulado",
      romance: "💌 Pacote Romântico",
      online: "📡 Modo Online",
      post: "📮 Publicar e Compartilhar Desafios",
    },
    themes: { neon: "🌃 Neon", casino: "🎰 Cassino", izakaya: "🏮 Izakaya" },
    rigTitle: "🃏 Modo Manipulado",
    rigDesc: "Escolha quem terá mais chance de ganhar a próxima rodada",
    rigClear: "Remover",
    rigSet: (name) => `Agora 【${name}】 tem mais chance de ganhar a próxima rodada!`,
    rigOff: "Modo manipulado desativado",
    noticeHTML: "Beba com responsabilidade e somente se tiver idade legal.<br>Nunca obrigue ninguém a beber ou fazer um desafio.",
    setupTitle: "Adicionar Jogadores",
    modeMf: "Meninos vs Meninas",
    modeAll: "Todos juntos",
    teamM: "♂ Time Meninos",
    teamF: "♀ Time Meninas",
    teamA: "🍻 Jogadores",
    placeholder: "Digite um nome",
    add: "Adicionar",
    gameStart: "🎲 COMEÇAR!",
    backTitle: "← Voltar ao início",
    backSetup: "← Trocar jogadores",
    msgDup: "Esse nome já foi cadastrado",
    msgMax: "Você pode cadastrar até 12 jogadores",
    msgNeedMf: "Adicione pelo menos 1 menino, 1 menina e 3 jogadores no total",
    msgNeedAll: "Adicione pelo menos 3 jogadores",
    coupleTeaser: "Só vocês dois? Experimente o Modo Casal! É um conteúdo premium.",
    packTeaser: (packName) => `"${packName}" é conteúdo da versão premium.`,
    spiceLabel: "🌶️ Nível de Picância",
    spiceLocked: "O nível 3 em diante é desbloqueado na versão premium.",
    modalTitle: "✨ Versão Premium ✨",
    modalPrice: "Pagamento único R$9,90 (em breve!)",
    modalClose: "Fechar",
    voices: {
      random: "🎲 Voz surpresa (muda toda vez)",
      mc: "🎤 Apresentador padrão",
      oyaji: "👨 Voz grave e séria",
      girl: "👧 Voz de menina fofa",
    },
    voiceSample: {
      mc: "Eu vou ler os desafios!",
      oyaji: "Eu leio para vocês.",
      girl: "Eu leio, vamos lá!",
    },
    bgmOn: "🎷 Trilha jazz LIGADA",
    bgmOff: "🎷 Trilha jazz DESLIGADA",
    statusStart: "🎯 Quem vai encarar o desafio...!?",
    spinTaunt: "😈 Quem será...!?",
    spinBtn: "🎰 GIRAR A ROLETA!",
    statusPicked: (name) => `É... 【${name}】!`,
    statusOdai: "🔥 AQUI ESTÁ O DESAFIO!",
    statusKing: "👑 TODOS DIANTE DO REI!",
    kingCard: (name) =>
      `👑 TODOS DIANTE DO REI!\n\nO Rei é 【${name}】!\n\nA ordem do Rei é absoluta!\nInvente o desafio que quiser!`,
    kingSpeech: (name) =>
      `O Rei é ${name}! A ordem do Rei é absoluta! Invente o desafio que quiser!`,
    speak: "🔊 Ler novamente",
    pass: "🔄 Pular (novo desafio)",
    share: "📤 Compartilhar",
    shareCopied: "Link copiado!",
    copyShareTitle: "📋 Copiado!",
    copyShareText: (app) => `Seu texto para compartilhar foi copiado! Assim que o ${app} abrir, é só colar e publicar!`,
    copyShareOpen: (app) => `Abrir ${app}`,
    copyShareClose: "Depois",
    shareAppText: "🎰 Batsu Roulette - o jogo de desafios definitivo para festas!",
    shareOdaiText: (text) => text, // sem hashtags em chats 1:1 (hashtags do X são adicionadas em shareToX())
    shareOnX: "Compartilhar no 𝕏",
    next: "🎰 PRÓXIMA RODADA!",
    ceremonyTitle: (n) => `🏆 RESULTADOS ATÉ AGORA! (${n} rodadas)`,
    ceremonyKing: (name, count) => `👑 Rei da noite: 【${name}】 (${count}x)`,
    ceremonyChallenge: (name, count) => `🎯 Mais desafios: 【${name}】 (${count}x)`,
    ceremonyNoKing: "👑 Ainda nenhum Rei apareceu",
    ceremonyContinue: "🎉 Continuar",
    bgmGenres: { jazz: "🎷 Jazz", edm: "🎧 EDM", enka: "🎤 Enka" },
    romanceOn: "💌 Mudou para o Pacote Romântico",
    romanceOff: "🎲 Voltou ao pacote padrão",
    adultOn: "🔞 Mudou para o Pacote Somente Adultos",
    adultOff: "🎲 Voltou ao pacote padrão",
    agegateTitle: "🔞 Verificação de idade",
    agegateDesc: "O pacote Somente Adultos inclui desafios com contato físico leve entre parceiros. Continue apenas se tiver 18 anos ou mais.",
    agegateYes: "Tenho 18 anos ou mais",
    agegateNo: "Melhor não",
    upgradeBtn: "💎 Atualizar agora",
    upgradeNotConfigured: "Os pagamentos ainda não foram configurados. Volte a tentar em breve.",
    unlockedTitle: "✨ Versão Premium Ativada!",
    unlockedDesc: "Obrigado pela compra! Todo o conteúdo premium — Pacote Somente Adultos, Modo Manipulado, temas da roleta e mais — já está desbloqueado. Saúde! 🍻",
    unlockedClose: "Vamos lá",
    subTitle: "📮 Publicar e Compartilhar Desafios",
    subDesc: "Envie um desafio original que você inventou. Após passar pela triagem automática e revisão, será compartilhado com outros usuários (não inclua informações pessoais nem ofensas).",
    subPlaceholder: "ex: imitar seu famoso favorito",
    subPostBtn: "Enviar",
    subListTitle: "🌟 Desafios da Comunidade",
    subEmpty: "Ainda não há envios. Seja o primeiro!",
    subSpeak: "🔊 Ler em voz alta",
    subReport: "🚩 Denunciar",
    subClose: "Fechar",
    subPostedPending: "Enviado! Será compartilhado com todos após a revisão.",
    subRejectedNgWord: "Desculpe, isso não pode ser publicado (contém conteúdo inadequado).",
    subRejectedEmpty: "Por favor, escreva um desafio.",
    subRejectedTooLong: "Por favor, use no máximo 200 caracteres.",
    subNotConfigured: "A função de publicar e compartilhar ainda não está configurada.",
    subReported: "Denunciado. Obrigado por ajudar.",
    adminTitle: "🛡️ Envios Pendentes",
    adminApprove: "✅ Aprovar",
    adminReject: "❌ Rejeitar",
    adminEmpty: "Não há envios aguardando revisão.",
    adminClose: "Fechar",
    achTitle: "🏆 Conquistas",
    achClose: "Fechar",
    achUnlocked: (name) => `🏅 Conquista desbloqueada: ${name}!`,
    hlTitle: "📸 Melhores momentos da noite",
    hlEmpty: "Ainda não há momentos salvos. Eles são salvos automaticamente quando um desafio é revelado.",
    hlClose: "Fechar",
    onlineTitle: "📡 Modo Festa Online",
    onlineDesc: "Jogue junto com pessoas em outros lugares, por exemplo em uma chamada de Zoom",
    onlineCreateBtn: "🖥️ Criar sala (anfitrião)",
    onlineJoinPlaceholder: "Código de 4 dígitos",
    onlineJoinBtn: "Entrar",
    onlineClose: "Fechar",
    onlineNotConfigured: "O modo online ainda não está configurado. Consulte \"Configuração do modo online\" no documento de requisitos.",
    onlineRoomCreated: (code) => `Sala criada! Compartilhe o código "${code}" com seus amigos pelo chat do Zoom, etc.`,
    onlineInvalidCode: "Por favor, digite um código de 4 dígitos",
    onlineJoinFailed: "Não foi possível encontrar essa sala",
    onlineGuestTitle: "📡 Aguardando…",
    onlineGuestWaiting: (code) => `Código da sala: ${code}\nAguardando o anfitrião girar a roleta…`,
    onlineHostBadge: (code) => `📡 Sala: ${code} (compartilhe este código com os convidados)`,
    onlineLeave: "← Sair",
  },
};

function t(key) {
  return UI[state.lang][key];
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

  document.getElementById("t-spice-label").textContent = u.spiceLabel;
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
}

/* =========================================================
   タイトル画面
   ========================================================= */
document.getElementById("btn-start").addEventListener("click", () => {
  unlockSpeech(); // ゲームの一番最初のタップで読み上げ機能を起こしておく
  showScreen("setup");
});

// 有料版（ロック中）ボタン → ご案内モーダル
const modal = document.getElementById("modal-premium");
const modalUpgradeBtn = document.getElementById("modal-upgrade");

// 有料版ご案内モーダルを、アップグレードボタン付きで表示する
function showPremiumModal(text) {
  document.getElementById("modal-text").textContent = text;
  modalUpgradeBtn.textContent = t("upgradeBtn");
  modalUpgradeBtn.classList.remove("hidden");
  modal.classList.remove("hidden");
}

document.querySelectorAll(".btn-locked").forEach((btn) => {
  // romance と online と adult は個別に実装済みの機能なので、専用ハンドラに任せる
  if (["romance", "online", "adult"].includes(btn.dataset.pack)) return;
  btn.addEventListener("click", () => {
    showPremiumModal(t("packTeaser")(UI[state.lang].packs[btn.dataset.pack]));
  });
});
document.getElementById("modal-close").addEventListener("click", () => {
  modal.classList.add("hidden");
});
modalUpgradeBtn.addEventListener("click", () => {
  const opened = Billing.openCheckout();
  if (!opened) showToast(t("upgradeNotConfigured"));
});

// 有料機能をブロックして案内モーダルを出す（未解放のときだけ true を返す）
function blockIfNotPremium(packKey) {
  if (isPremiumUnlocked()) return false;
  showPremiumModal(t("packTeaser")(UI[state.lang].packs[packKey]));
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

/* ---------------- 💌 恋愛パック切り替え（有料機能） ---------------- */
const btnRomance = document.getElementById("pack-romance");
const btnAdult = document.getElementById("pack-adult");

btnRomance.addEventListener("click", () => {
  if (blockIfNotPremium("romance")) return;
  state.pack = state.pack === "romance" ? "standard" : "romance";
  btnRomance.classList.toggle("active-pack", state.pack === "romance");
  btnAdult.classList.remove("active-pack");
  showToast(state.pack === "romance" ? t("romanceOn") : t("romanceOff"));
});

/* ---------------- 🔞 大人向けパック切り替え（有料機能・年齢確認つき） ---------------- */
const modalAgeGate = document.getElementById("modal-agegate");

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
  btnRomance.classList.remove("active-pack");
  btnAdult.classList.add("active-pack");
  showToast(t("adultOn"));
});
document.getElementById("agegate-no").addEventListener("click", () => {
  modalAgeGate.classList.add("hidden");
});

/* ---------------- 🌶️ お色気レベルスライダー（有料機能：レベル3以上） ---------------- */
const spiceSlider = document.getElementById("spice-slider");
const spiceValueEl = document.getElementById("spice-value");
const SPICE_TO_PACK = { 1: "standard", 2: "standard", 3: "romance", 4: "adult", 5: "adult" };
const FREE_SPICE_LEVEL = 2;

function applySpiceLevel(level) {
  spiceValueEl.textContent = `Lv.${level}`;
  state.pack = SPICE_TO_PACK[level] || "standard";
  btnRomance.classList.toggle("active-pack", state.pack === "romance");
  btnAdult.classList.toggle("active-pack", state.pack === "adult");
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
  const code = Online.createRoom();
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
  const ok = Online.joinRoom(code, handleOnlineResult);
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
    if (state.everyone.length === 2) {
      if (!isPremiumUnlocked()) {
        showPremiumModal(t("coupleTeaser"));
        return;
      }
      state.pack = "couple";
    } else if (state.everyone.length < 3) {
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
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// 王様回数・お題回数の記録（表彰式で使う）
function bumpStat(name, field) {
  if (!state.stats[name]) state.stats[name] = { king: 0, challenge: 0 };
  state.stats[name][field]++;
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

  // 📡 幹事としてオンライン部屋を開いている間は、コードを表示し続ける
  if (state.onlineRole === "host" && state.onlineCode) {
    onlineHostBadge.textContent = t("onlineHostBadge")(state.onlineCode);
    onlineHostBadge.classList.remove("hidden");
  } else {
    onlineHostBadge.classList.add("hidden");
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

  // このスピンが王様モードになるかどうか、先に運命を決めておく
  const kingRound = Math.random() < KING_CHANCE;

  spinWheel((winner, idx) => {
    // 🃏 イカサマの仕込みは1回のスピンだけで自動的に解除する
    state.riggedName = null;
    btnRig.classList.remove("active");

    // 当たったコマを点滅させて視線を誘導する
    flashWinnerWedge(idx);
    gameStatus.classList.remove("taunt-pulse");

    bumpStat(winner.name, kingRound ? "king" : "challenge");
    state.roundCount++;
    state.pendingCeremony = state.roundCount % CEREMONY_INTERVAL === 0;

    Achievements.bump("totalRounds");
    if (kingRound) Achievements.bump("totalKings");

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

// 結果発表の瞬間の演出（紙吹雪・振動）をまとめて起動する
function celebrate(colors, vibrationPattern) {
  Confetti.burst(colors);
  if ("vibrate" in navigator) {
    try { navigator.vibrate(vibrationPattern); } catch (e) {}
  }
}

// お題の発表（生成 → 表示 → 朗読）
function showOdai(from, to) {
  state.isKing = false;
  state.currentPair = { from, to };

  const odai = generateOdai(from.name, to.name, state.lang, state.pack);
  state.currentSpeech = odai.speechText;

  gameStatus.textContent = t("statusOdai");
  odaiCard.textContent = odai.displayText;
  odaiCard.classList.remove("king-card");
  btnPass.classList.remove("hidden");
  wheelArea.classList.add("hidden");
  odaiArea.classList.remove("hidden");

  const accentA = cachedThemeColors.a;
  const accentB = cachedThemeColors.b;
  celebrate([accentA, accentB, "#ffffff"], 80);
  SFX.reveal();

  lastHighlightDataUrl = Highlights.capture(odai.displayText, accentA, document.getElementById("t-logo").textContent);
  if (state.onlineRole === "host") {
    Online.broadcast({ type: "odai", displayText: odai.displayText, speechText: odai.speechText, lang: state.lang });
  }

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

  celebrate(["#ffe14b", "#ffb52d", "#ffffff"], [100, 50, 100, 50, 200]);
  SFX.kingFanfare();

  lastHighlightDataUrl = Highlights.capture(t("kingCard")(king.name), "#ffe14b", document.getElementById("t-logo").textContent);
  if (state.onlineRole === "host") {
    Online.broadcast({ type: "king", displayText: t("kingCard")(king.name), speechText: state.currentSpeech, lang: state.lang });
  }

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
  Achievements.bump("totalPasses");
});

// 📤 共有（対応端末はOSの共有シートを開き、非対応ならリンクをコピーする）
const GAME_URL = "https://marimo530122-cmyk.github.io/baturu-retto/";
let lastHighlightDataUrl = null; // 直前のお題ハイライト画像（TikTok/Instagram向けの画像共有用）

// 🐦 世界向けハッシュタグ（X等の公開SNSシェア専用。個人間チャットには付けない）
// ※「#DirtyDare」案は「不快感を与えない」基準に沿うよう「#NaughtyDare」（茶目っ気のある響き）に調整した
const WORLD_HASHTAGS = "#BatsuRoulette #AdultPartyGame #SpicyRoulette #NaughtyDare #SafeFun";

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

// 次のルーレットへ（10ラウンドごとに表彰式を挟む）
document.getElementById("btn-next").addEventListener("click", () => {
  speechSynthesis.cancel();
  if (state.pendingCeremony) {
    state.pendingCeremony = false;
    showCeremony();
  } else {
    startRound();
  }
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

// Stripeの決済リンクから戻ってきて、たった今プレミアムが解放された場合だけお祝いを出す
if (typeof Billing !== "undefined" && Billing.wasJustUnlocked()) {
  showPremiumUnlockedCelebration();
}
