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

/* ---------------- 🧑‍⚖️ 審査員ハプニングモードの発動確率 ---------------- */
// 王様モードでない回のうち、この確率で「今回の審査員」が参加者の中から
// ランダムに指名される(通常のお題に一言添えるだけの演出)。実際に何か
// 追加でやらせるかどうかの判定・内容はアプリでは決めず、その場のノリ・
// 人間の判断に完全に委ねる(アプリ側は罰の内容を一切指定しない)。
const JUDGE_CHANCE = 0.35; // 35%

/* ---------------- 表彰式の間隔 ---------------- */
const CEREMONY_INTERVAL = 10; // 10ラウンドごとに表彰式

/* ---------------- 言語の切り替え順番 ---------------- */
const LANG_CYCLE = ["ja", "en", "zh", "ko", "es", "pt", "vi", "de", "tl"];
const LANG_LABELS = { ja: "日", en: "EN", zh: "中", ko: "한", es: "ES", pt: "PT", vi: "VI", de: "DE", tl: "TL" };

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
  currentOdaiPack: null, // パス用（👑王様ゲームモードの「エッチなお題」等、state.packと異なるパックでお題を出した場合に記憶）
  currentKing: null,   // パス用（王様はそのまま、対象者だけ選び直す）
  currentKingTargets: null, // 🔞大人向けパック／👑王様ゲームモードの王様の対象者(配列)。標準パックの王様はnull(パス不可)
  currentKingShowReminder: false, // パス用（👑王様ゲームモードの安全ガイド表示を、対象者を選び直した後も維持する）
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
      nerutoon: "💘 ねるとんZoom",
      party: "🎉 法人/パーティー",
      noalcohol: "🥤 ノンアル版",
      solo: "🍶 ひとり飲み",
      kinggame: "👑 王様ゲームモード（日本人向け）",
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
    partyTitle: "🎉 法人・パーティープラン",
    partyDesc: "結婚式の二次会や会社の飲み会にぴったりの特別お題パックです。買い切りで、通常のプレミアムとは別売りになっています。",
    partyPrice: "買い切り（Stripeの決済リンク設定後に価格が表示されます）",
    partyUpgrade: "🎉 このプランを購入する",
    partyOn: "🎉 法人・パーティープラン オン",
    partyOff: "🎉 法人・パーティープラン オフ",
    referralTitle: "🔗 お友達紹介 / アフィリエイト",
    referralDesc: "このリンクを友達に送って一緒に遊ぶと、二人とも「プレミアム24時間お試し」がもらえます！",
    referralCopy: "📋 コピー",
    referralCopied: "リンクをコピーしました！",
    referralBonusActive: "✨ 現在「プレミアム24時間お試し」が有効です！",
    referralAffiliateNote: "💡 インフルエンサーの方へ：このリンク経由でプレミアムが購入されると、Stripeの決済一覧にこのコードが記録されます。運営までご連絡いただければ、紹介料についてご相談できます。",
    referralClose: "とじる",
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
    kingCard: (name, targets, showReminder) => {
      const base = targets && targets.length
        ? `👑 王様、誕生！！\n\n王様は【${name}】！\n【${targets.join("・")}】に、好きな罰を命じよう！`
        : `👑 王様、誕生！！\n\n王様は【${name}】！\n\n王様の命令は絶対！\nみんなへのお題を自由に出そう！`;
      return showReminder ? `${base}\n\n⚠️宗教・政治・強要飲酒はNG／接触はソフトタッチまで／外見いじりはNG／イヤなら遠慮なくパスしてOK` : base;
    },
    kingSpeech: (name, targets) =>
      targets && targets.length
        ? `王様は、${name}さん！${targets.join("さんと")}さんに、好きな罰を命じてください！`
        : `王様は、${name}さん！王様の命令は、絶対！好きなお題を出してください！`,
    judgeAnnounce: (name) => `🧑‍⚖️ 今回の審査員は【${name}】！\n\n`,
    judgeAnnounceSpeech: (name) => `今回の審査員は、${name}さん！`,
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
    shareOnX: "Xでシェア",
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
    nerutoonOn: "💘 ねるとんZoomモードに切り替えました",
    nerutoonOff: "🎲 通常パックに戻しました",
    familyOn: "👨‍👩‍👧 ファミリーパックに切り替えました",
    familyOff: "🎲 通常パックに戻しました",
    coupleOn: "💑 1対1モードに切り替えました",
    coupleOff: "🎲 通常パックに戻しました",
    noalcoholOn: "🥤 ノンアル版に切り替えました",
    noalcoholOff: "🎲 通常パックに戻しました",
    soloOn: "🍶 ひとり飲みモードに切り替えました",
    soloOff: "🎲 通常パックに戻しました",
    kinggameOn: "👑 王様ゲームモードに切り替えました",
    kinggameOff: "🎲 通常パックに戻しました",
    kinggameDisclaimerTitle: "👑 王様の絶対ルール／注意事項",
    kinggameDisclaimerDesc: "人権を無視した誹謗中傷、過度な暴飲暴食の強要、身体に危害が及ぶような「痛いこと」は絶対に禁止です。王様であっても節度を守り、全員が笑顔になれる範囲で命令してください。トラブルや怪我について、当アプリは一切の責任を負いません。楽しく安全に遊びましょう！",
    kinggameDisclaimerAgree: "同意して始める",
    kinggameDisclaimerCancel: "やめておく",
    kinggameNotice: "👑 王様ゲームモードは、罰の内容をその場の人が即興で考える仕組みです。文化や習慣の違いに配慮し、日本人向けとしています。海外からお越しの方は、タップをご遠慮ください。",
    recModeOn: "🎬 RECモードON（撮影用の見た目に切り替えました）",
    recModeOff: "🎬 RECモードOFF",
    viralTitle: "🚀 バイラル投稿キット",
    viralDesc: "動画を撮ったら、そのままコピペで投稿できます。",
    viralRegenerate: "🔄 別の案にする",
    viralScript: "①名前を入れる → ②ルーレットを回す → ③お題発表の瞬間の顔を撮る（ここが一番バズる）",
    viralCopyAll: "📋 全部コピーする",
    viralCopyShortUrl: "🔗 短縮URLをコピー",
    viralShortening: "短縮中…",
    viralShortUrlCopied: (url) => `コピーしました！ ${url}`,
    viralShortUrlFallback: "短縮に失敗したので、通常のリンクをコピーしました",
    viralClose: "とじる",
    viralFooter: "📮 #BatsuRoulette を付けて投稿してね！面白い動画は公式が紹介するかも！",
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
    helpClose: "とじる",
    achUnlocked: (name) => `🏅 実績解除：${name}！`,
    helpTitle: "❓ アイコンの説明",
    helpItems: [
      "BGMのオン・オフ", "BGMのジャンル切り替え", "読み上げの声を切り替え", "表示言語の切り替え",
      "ルーレットの見た目（有料）", "お題結果の振り返り", "実績バッジ一覧", "お題の投稿・みんなの投稿",
      "アプリをシェア", "Xでシェア", "WhatsAppでシェア", "Telegramでシェア", "Instagramでシェア",
      "WeChatでシェア", "盛り上がる瞬間の録画モード", "SNS投稿用キット", "お友達紹介リンク",
    ],
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
      nerutoon: "💘 Matchmaking Zoom",
      noalcohol: "🥤 Non-Alcohol Pack",
      party: "🎉 Corporate/Party",
      solo: "🍶 Solo Drinking",
      kinggame: "👑 King Game Mode",
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
    kingCard: (name, targets, showReminder) => {
      const base = targets && targets.length
        ? `👑 ALL HAIL THE KING!\n\nThe King is 【${name}】!\nCommand a punishment for 【${targets.join(" & ")}】!`
        : `👑 ALL HAIL THE KING!\n\nThe King is 【${name}】!\n\nThe King's command is absolute!\nMake up any challenge you want!`;
      return showReminder ? `${base}\n\n⚠️ Keep it safe: no religion/politics, no forced drinking, soft-touch only, no body-shaming, anyone can pass anytime.` : base;
    },
    kingSpeech: (name, targets) =>
      targets && targets.length
        ? `All hail King ${name}! Give a punishment to ${targets.join(" and ")}!`
        : `The King is ${name}! The King's command is absolute! Make up any challenge you want!`,
    judgeAnnounce: (name) => `🧑‍⚖️ Today's judge is 【${name}】!\n\n`,
    judgeAnnounceSpeech: (name) => `Today's judge is ${name}!`,
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
    shareOnX: "Share on X",
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
    nerutoonOn: "💘 Switched to Matchmaking Zoom Mode",
    nerutoonOff: "🎲 Switched back to Standard Pack",
    familyOn: "👨‍👩‍👧 Switched to Family Pack",
    familyOff: "🎲 Switched back to Standard Pack",
    coupleOn: "💑 Switched to 1-on-1 Mode",
    coupleOff: "🎲 Switched back to Standard Pack",
    partyOn: "🎉 Corporate/Party Plan On",
    partyOff: "🎉 Corporate/Party Plan Off",
    noalcoholOn: "🥤 Switched to Non-Alcohol Pack",
    noalcoholOff: "🎲 Switched back to Standard Pack",
    soloOn: "🍶 Switched to Solo Drinking Mode",
    soloOff: "🎲 Switched back to Standard Pack",
    kinggameOn: "👑 Switched to King Game Mode",
    kinggameOff: "🎲 Switched back to Standard Pack",
    kinggameDisclaimerTitle: "👑 The King's Absolute Rules / Notice",
    kinggameDisclaimerDesc: "Harassment that disrespects human dignity, forcing excessive eating or drinking, and anything that could physically hurt someone are strictly forbidden. Even the King must show restraint — only give commands that keep everyone smiling. This app takes no responsibility for any trouble or injury. Play safe and have fun!",
    kinggameDisclaimerAgree: "Agree & Start",
    kinggameDisclaimerCancel: "Never mind",
    kinggameNotice: "👑 In King Game Mode, the \"King\" makes up punishments on the spot. Since this depends on shared cultural context, it's designed for Japanese-speaking guests only. If you're visiting from abroad, please don't tap this button. Thank you!",
    recModeOn: "🎬 REC Mode ON (switched to filming-friendly view)",
    recModeOff: "🎬 REC Mode OFF",
    viralTitle: "🚀 Viral Post Kit",
    viralDesc: "Once you've filmed a clip, just copy-paste this straight into your post.",
    viralRegenerate: "🔄 Try another one",
    viralScript: "① Enter names → ② Spin the wheel → ③ Film the reaction the moment the dare is revealed (that's the money shot)",
    viralCopyAll: "📋 Copy everything",
    viralCopyShortUrl: "🔗 Copy short URL",
    viralShortening: "Shortening…",
    viralShortUrlCopied: (url) => `Copied! ${url}`,
    viralShortUrlFallback: "Shortening failed, so the regular link was copied instead",
    viralClose: "Close",
    viralFooter: "📮 Tag your post with #BatsuRoulette — the best videos might get featured!",
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
    helpClose: "Close",
    achUnlocked: (name) => `🏅 Achievement unlocked: ${name}!`,
    helpTitle: "❓ What the icons do",
    helpItems: [
      "Toggle BGM on/off", "Switch BGM genre", "Switch the read-aloud voice", "Switch display language",
      "Roulette look & theme (premium)", "Look back at past results", "Achievement badges", "Post & browse dare submissions",
      "Share the app", "Share on X", "Share on WhatsApp", "Share on Telegram", "Share on Instagram",
      "Share on WeChat", "Recording mode for big moments", "Social media posting kit", "Get your referral link",
    ],
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
      nerutoon: "💘 聯誼Zoom",
      noalcohol: "🥤 無酒精版",
      party: "🎉 公司/派對",
      solo: "🍶 獨自小酌",
      kinggame: "👑 國王遊戲模式",
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
    kingCard: (name, targets, showReminder) => {
      const base = targets && targets.length
        ? `👑 國王誕生！！\n\n國王是【${name}】！\n請對【${targets.join("、")}】下達你想到的懲罰！`
        : `👑 國王誕生！！\n\n國王是【${name}】！\n\n國王的命令是絕對的！\n盡情對大家出題吧！`;
      return showReminder ? `${base}\n\n⚠️禁止宗教／政治／強迫喝酒，肢體接觸僅限輕觸，禁止嘲笑外貌，不想玩隨時可以Pass` : base;
    },
    kingSpeech: (name, targets) =>
      targets && targets.length
        ? `國王是，${name}！請對${targets.join("和")}下達懲罰吧！`
        : `國王是，${name}！國王的命令是絕對的！請自由對大家出題！`,
    judgeAnnounce: (name) => `🧑‍⚖️ 這回合的評審是【${name}】！\n\n`,
    judgeAnnounceSpeech: (name) => `這回合的評審是，${name}！`,
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
    shareOnX: "在X分享",
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
    nerutoonOn: "💘 已切換為聯誼Zoom模式",
    nerutoonOff: "🎲 已切回標準套組",
    familyOn: "👨‍👩‍👧 已切換為家庭套組",
    familyOff: "🎲 已切回標準套組",
    coupleOn: "💑 已切換為一對一模式",
    coupleOff: "🎲 已切回標準套組",
    partyOn: "🎉 法人・派對方案 開啟",
    partyOff: "🎉 法人・派對方案 關閉",
    noalcoholOn: "🥤 已切換為無酒精版",
    noalcoholOff: "🎲 已切回標準套組",
    soloOn: "🍶 已切換為獨自小酌模式",
    soloOff: "🎲 已切回標準套組",
    kinggameOn: "👑 已切換為國王遊戲模式",
    kinggameOff: "🎲 已切回標準套組",
    kinggameDisclaimerTitle: "👑 國王的絕對規則／注意事項",
    kinggameDisclaimerDesc: "嚴禁不尊重人格的辱罵、強迫過度飲食、以及任何可能對身體造成傷害的「痛」的懲罰。即使是國王也請保持分寸，命令內容須讓大家都能笑著接受。若發生糾紛或受傷，本應用概不負責。請開心且安全地遊玩！",
    kinggameDisclaimerAgree: "同意並開始",
    kinggameDisclaimerCancel: "先不要",
    kinggameNotice: "👑 國王遊戲模式是由在場的人臨場發揮懲罰內容。考慮到文化與習慣的差異，此模式僅供日本人使用。如果您是海外訪客，請不要點擊此按鈕，謝謝！",
    recModeOn: "🎬 拍攝模式已開啟（切換為適合拍攝的畫面）",
    recModeOff: "🎬 拍攝模式已關閉",
    viralTitle: "🚀 爆紅投稿套件",
    viralDesc: "拍完影片後，直接複製貼上就能投稿。",
    viralRegenerate: "🔄 換一個文案",
    viralScript: "①輸入名字 → ②轉動輪盤 → ③拍下題目公布瞬間的表情（這裡最容易爆紅）",
    viralCopyAll: "📋 全部複製",
    viralCopyShortUrl: "🔗 複製短網址",
    viralShortening: "縮短中…",
    viralShortUrlCopied: (url) => `已複製！${url}`,
    viralShortUrlFallback: "縮短失敗，已改為複製一般連結",
    viralClose: "關閉",
    viralFooter: "📮 記得標註 #BatsuRoulette 投稿哦！有趣的影片可能會被官方介紹！",
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
    helpClose: "關閉",
    achUnlocked: (name) => `🏅 解鎖成就：${name}！`,
    helpTitle: "❓ 圖示說明",
    helpItems: [
      "BGM開關", "切換BGM曲風", "切換朗讀聲音", "切換顯示語言",
      "輪盤外觀主題（付費）", "回顧過去的結果", "成就徽章一覽", "投稿・瀏覽大家的投稿",
      "分享本應用程式", "在X分享", "在WhatsApp分享", "在Telegram分享", "在Instagram分享",
      "在WeChat分享", "精彩瞬間錄影模式", "社群投稿套件", "取得推薦連結",
    ],
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
      nerutoon: "💘 미팅 Zoom",
      noalcohol: "🥤 논알코올 팩",
      party: "🎉 회사/파티",
      solo: "🍶 혼술",
      kinggame: "👑 왕게임 모드",
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
    kingCard: (name, targets, showReminder) => {
      const base = targets && targets.length
        ? `👑 왕 탄생！！\n\n왕은【${name}】!\n【${targets.join("・")}】에게 원하는 벌칙을 명령하세요！`
        : `👑 왕 탄생！！\n\n왕은【${name}】!\n\n왕의 명령은 절대적！\n모두에게 자유롭게 명령을 내려보세요！`;
      return showReminder ? `${base}\n\n⚠️종교・정치・음주 강요 금지／스킨십은 가벼운 터치까지／외모 비하 금지／싫으면 언제든 패스 가능` : base;
    },
    kingSpeech: (name, targets) =>
      targets && targets.length
        ? `왕은, ${name}! ${targets.join("과 ")}에게 벌칙을 명령해주세요!`
        : `왕은, ${name}! 왕의 명령은 절대적! 자유롭게 명령을 내려주세요!`,
    judgeAnnounce: (name) => `🧑‍⚖️ 이번 심사위원은【${name}】！\n\n`,
    judgeAnnounceSpeech: (name) => `이번 심사위원은, ${name}님!`,
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
    shareOnX: "X에 공유하기",
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
    nerutoonOn: "💘 미팅 Zoom 모드로 전환했습니다",
    nerutoonOff: "🎲 기본 팩으로 되돌렸습니다",
    familyOn: "👨‍👩‍👧 패밀리 팩으로 전환했습니다",
    familyOff: "🎲 기본 팩으로 되돌렸습니다",
    coupleOn: "💑 1대1 모드로 전환했습니다",
    coupleOff: "🎲 기본 팩으로 되돌렸습니다",
    partyOn: "🎉 법인・파티 플랜 켜짐",
    partyOff: "🎉 법인・파티 플랜 꺼짐",
    noalcoholOn: "🥤 논알코올 팩으로 전환했습니다",
    noalcoholOff: "🎲 기본 팩으로 되돌렸습니다",
    soloOn: "🍶 혼술 모드로 전환했습니다",
    soloOff: "🎲 기본 팩으로 되돌렸습니다",
    kinggameOn: "👑 왕게임 모드로 전환했습니다",
    kinggameOff: "🎲 기본 팩으로 되돌렸습니다",
    kinggameDisclaimerTitle: "👑 왕의 절대 규칙 / 주의사항",
    kinggameDisclaimerDesc: "인격을 무시하는 비방, 과도한 음주·음식 강요, 신체에 위해가 되는 「아픈 것」은 절대 금지입니다. 왕이라도 절도를 지키고, 모두가 웃을 수 있는 범위에서 명령해주세요. 문제나 부상에 대해 본 앱은 일체 책임지지 않습니다. 즐겁고 안전하게 즐기세요!",
    kinggameDisclaimerAgree: "동의하고 시작하기",
    kinggameDisclaimerCancel: "그만두기",
    kinggameNotice: "👑 왕게임 모드는 그 자리에 있는 사람이 벌칙 내용을 즉흥적으로 정하는 방식입니다. 문화와 관습의 차이를 고려하여 일본인 전용으로 제공하고 있습니다. 해외에서 오신 분은 이 버튼을 누르지 말아 주세요. 감사합니다!",
    recModeOn: "🎬 REC 모드 ON (촬영용 화면으로 전환했습니다)",
    recModeOff: "🎬 REC 모드 OFF",
    viralTitle: "🚀 바이럴 게시 키트",
    viralDesc: "영상을 촬영했다면, 그대로 복사해서 게시글에 붙여넣으세요.",
    viralRegenerate: "🔄 다른 문구로",
    viralScript: "①이름 입력 → ②룰렛 돌리기 → ③벌칙 공개 순간의 표정 촬영(여기가 가장 화제가 됨)",
    viralCopyAll: "📋 전체 복사하기",
    viralCopyShortUrl: "🔗 단축 URL 복사",
    viralShortening: "단축 중…",
    viralShortUrlCopied: (url) => `복사했습니다! ${url}`,
    viralShortUrlFallback: "단축에 실패하여 일반 링크를 복사했습니다",
    viralClose: "닫기",
    viralFooter: "📮 #BatsuRoulette 태그를 붙여서 올려주세요! 재밌는 영상은 공식 계정이 소개할 수도 있어요!",
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
    helpClose: "닫기",
    achUnlocked: (name) => `🏅 업적 달성: ${name}!`,
    helpTitle: "❓ 아이콘 설명",
    helpItems: [
      "BGM 켜기/끄기", "BGM 장르 전환", "읽어주는 목소리 전환", "표시 언어 전환",
      "룰렛 테마(프리미엄)", "지난 결과 돌아보기", "업적 배지 목록", "투고・모두의 투고 보기",
      "앱 공유하기", "X에 공유", "WhatsApp에 공유", "Telegram에 공유", "Instagram에 공유",
      "WeChat에 공유", "하이라이트 녹화 모드", "SNS 게시용 키트", "친구 추천 링크 받기",
    ],
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
      nerutoon: "💘 Zoom de Citas",
      noalcohol: "🥤 Paquete Sin Alcohol",
      party: "🎉 Corporativo/Fiesta",
      solo: "🍶 Beber Solo",
      kinggame: "👑 Modo Juego del Rey",
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
    kingCard: (name, targets, showReminder) => {
      const base = targets && targets.length
        ? `👑 ¡TODOS ANTE EL REY!\n\n¡El Rey es 【${name}】!\n¡Ordena un castigo para 【${targets.join(" y ")}】!`
        : `👑 ¡TODOS ANTE EL REY!\n\n¡El Rey es 【${name}】!\n\n¡La orden del Rey es absoluta!\n¡Inventa el reto que quieras!`;
      return showReminder ? `${base}\n\n⚠️ Mantén la seguridad: nada de religión/política, sin obligar a beber, solo contacto suave, nada de burlas por el físico, cualquiera puede pasar cuando quiera.` : base;
    },
    kingSpeech: (name, targets) =>
      targets && targets.length
        ? `¡El Rey es ${name}! ¡Ordena un castigo para ${targets.join(" y ")}!`
        : `¡El Rey es ${name}! ¡La orden del Rey es absoluta! ¡Inventa el reto que quieras!`,
    judgeAnnounce: (name) => `🧑‍⚖️ El juez de esta ronda es 【${name}】!\n\n`,
    judgeAnnounceSpeech: (name) => `¡El juez de esta ronda es ${name}!`,
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
    shareOnX: "Compartir en X",
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
    nerutoonOn: "💘 Cambiado al Modo Zoom de Citas",
    nerutoonOff: "🎲 Vuelto al paquete estándar",
    familyOn: "👨‍👩‍👧 Cambiado al Paquete Familiar",
    familyOff: "🎲 Vuelto al paquete estándar",
    coupleOn: "💑 Cambiado al Modo Uno a Uno",
    coupleOff: "🎲 Vuelto al paquete estándar",
    partyOn: "🎉 Plan Corporativo/Fiesta Activado",
    partyOff: "🎉 Plan Corporativo/Fiesta Desactivado",
    noalcoholOn: "🥤 Cambiado al Paquete Sin Alcohol",
    noalcoholOff: "🎲 Vuelto al paquete estándar",
    soloOn: "🍶 Cambiado al Modo Beber Solo",
    soloOff: "🎲 Vuelto al paquete estándar",
    kinggameOn: "👑 Cambiado al Modo Juego del Rey",
    kinggameOff: "🎲 Vuelto al paquete estándar",
    kinggameDisclaimerTitle: "👑 Reglas Absolutas del Rey / Aviso",
    kinggameDisclaimerDesc: "Están terminantemente prohibidos los insultos que falten al respeto humano, obligar a comer o beber en exceso, y cualquier cosa que pueda causar daño físico. Incluso el Rey debe mantener la moderación: da órdenes que hagan sonreír a todos. Esta app no se responsabiliza por problemas o lesiones. ¡Diviértanse de forma segura!",
    kinggameDisclaimerAgree: "Aceptar y Empezar",
    kinggameDisclaimerCancel: "Mejor no",
    kinggameNotice: "👑 En el Modo Juego del Rey, el \"Rey\" inventa castigos en el momento. Como esto depende del contexto cultural compartido, está diseñado solo para invitados de habla japonesa. Si vienes del extranjero, por favor no toques este botón. ¡Gracias!",
    recModeOn: "🎬 Modo REC activado (vista optimizada para grabar)",
    recModeOff: "🎬 Modo REC desactivado",
    viralTitle: "🚀 Kit de Publicación Viral",
    viralDesc: "Cuando grabes tu video, solo copia y pega esto en tu publicación.",
    viralRegenerate: "🔄 Probar otra frase",
    viralScript: "① Ingresa los nombres → ② Gira la ruleta → ③ Graba la reacción al revelar el reto (ese es el momento clave)",
    viralCopyAll: "📋 Copiar todo",
    viralCopyShortUrl: "🔗 Copiar URL corta",
    viralShortening: "Acortando…",
    viralShortUrlCopied: (url) => `¡Copiado! ${url}`,
    viralShortUrlFallback: "No se pudo acortar, así que se copió el enlace normal",
    viralClose: "Cerrar",
    viralFooter: "📮 ¡Etiqueta tu publicación con #BatsuRoulette! ¡Los mejores videos podrían ser destacados!",
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
    helpClose: "Cerrar",
    achUnlocked: (name) => `🏅 ¡Logro desbloqueado: ${name}!`,
    helpTitle: "❓ Qué hace cada icono",
    helpItems: [
      "Activar/desactivar BGM", "Cambiar género de BGM", "Cambiar voz narradora", "Cambiar idioma",
      "Tema visual de la ruleta (premium)", "Ver resultados anteriores", "Lista de logros", "Publicar y ver retos de otros",
      "Compartir la app", "Compartir en X", "Compartir en WhatsApp", "Compartir en Telegram", "Compartir en Instagram",
      "Compartir en WeChat", "Modo grabación de momentos", "Kit para redes sociales", "Obtener enlace de referido",
    ],
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
      nerutoon: "💘 Zoom de Paquera",
      noalcohol: "🥤 Pacote Sem Álcool",
      party: "🎉 Corporativo/Festa",
      solo: "🍶 Bebendo Sozinho",
      kinggame: "👑 Modo Jogo do Rei",
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
    kingCard: (name, targets, showReminder) => {
      const base = targets && targets.length
        ? `👑 TODOS DIANTE DO REI!\n\nO Rei é 【${name}】!\nDê um castigo para 【${targets.join(" e ")}】!`
        : `👑 TODOS DIANTE DO REI!\n\nO Rei é 【${name}】!\n\nA ordem do Rei é absoluta!\nInvente o desafio que quiser!`;
      return showReminder ? `${base}\n\n⚠️ Mantenha seguro: nada de religião/política, sem forçar bebida, apenas toques leves, nada de piadas sobre o corpo, qualquer um pode passar a qualquer momento.` : base;
    },
    kingSpeech: (name, targets) =>
      targets && targets.length
        ? `O Rei é ${name}! Dê um castigo para ${targets.join(" e ")}!`
        : `O Rei é ${name}! A ordem do Rei é absoluta! Invente o desafio que quiser!`,
    judgeAnnounce: (name) => `🧑‍⚖️ O juiz desta rodada é 【${name}】!\n\n`,
    judgeAnnounceSpeech: (name) => `O juiz desta rodada é ${name}!`,
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
    shareOnX: "Compartilhar no X",
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
    nerutoonOn: "💘 Mudou para o Modo Zoom de Paquera",
    nerutoonOff: "🎲 Voltou ao pacote padrão",
    familyOn: "👨‍👩‍👧 Mudou para o Pacote Família",
    familyOff: "🎲 Voltou ao pacote padrão",
    coupleOn: "💑 Mudou para o Modo a Dois",
    coupleOff: "🎲 Voltou ao pacote padrão",
    partyOn: "🎉 Plano Corporativo/Festa Ativado",
    partyOff: "🎉 Plano Corporativo/Festa Desativado",
    noalcoholOn: "🥤 Mudou para o Pacote Sem Álcool",
    noalcoholOff: "🎲 Voltou ao pacote padrão",
    soloOn: "🍶 Mudou para o Modo Bebendo Sozinho",
    soloOff: "🎲 Voltou ao pacote padrão",
    kinggameOn: "👑 Mudou para o Modo Jogo do Rei",
    kinggameOff: "🎲 Voltou ao pacote padrão",
    kinggameDisclaimerTitle: "👑 Regras Absolutas do Rei / Aviso",
    kinggameDisclaimerDesc: "É totalmente proibido humilhar alguém, forçar bebida ou comida em excesso, ou qualquer coisa que possa machucar fisicamente. Mesmo o Rei deve manter a moderação — dê ordens que deixem todos sorrindo. Este aplicativo não se responsabiliza por problemas ou ferimentos. Divirta-se com segurança!",
    kinggameDisclaimerAgree: "Concordar e Começar",
    kinggameDisclaimerCancel: "Deixa pra lá",
    kinggameNotice: "👑 No Modo Jogo do Rei, o \"Rei\" inventa castigos na hora. Como isso depende do contexto cultural compartilhado, foi criado apenas para convidados que falam japonês. Se você é visitante do exterior, por favor não toque neste botão. Obrigado!",
    recModeOn: "🎬 Modo REC ativado (visual otimizado para gravação)",
    recModeOff: "🎬 Modo REC desativado",
    viralTitle: "🚀 Kit de Postagem Viral",
    viralDesc: "Depois de gravar seu vídeo, é só copiar e colar isso na sua postagem.",
    viralRegenerate: "🔄 Tentar outra frase",
    viralScript: "① Digite os nomes → ② Gire a roleta → ③ Grave a reação no momento em que o desafio é revelado (esse é o momento chave)",
    viralCopyAll: "📋 Copiar tudo",
    viralCopyShortUrl: "🔗 Copiar URL curta",
    viralShortening: "Encurtando…",
    viralShortUrlCopied: (url) => `Copiado! ${url}`,
    viralShortUrlFallback: "Não foi possível encurtar, então o link normal foi copiado",
    viralClose: "Fechar",
    viralFooter: "📮 Marque sua postagem com #BatsuRoulette! Os melhores vídeos podem ser destacados!",
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
    helpClose: "Fechar",
    achUnlocked: (name) => `🏅 Conquista desbloqueada: ${name}!`,
    helpTitle: "❓ O que cada ícone faz",
    helpItems: [
      "Ativar/desativar BGM", "Trocar gênero da BGM", "Trocar voz de narração", "Trocar idioma",
      "Tema visual da roleta (premium)", "Ver resultados anteriores", "Lista de conquistas", "Publicar e ver desafios de outros",
      "Compartilhar o app", "Compartilhar no X", "Compartilhar no WhatsApp", "Compartilhar no Telegram", "Compartilhar no Instagram",
      "Compartilhar no WeChat", "Modo de gravação de momentos", "Kit para redes sociais", "Obter link de indicação",
    ],
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
  vi: {
    langName: "Tiếng Việt",
    sub: "Trò chơi làm bùng nổ mọi bữa tiệc",
    logoHTML: 'Vòng Quay <span class="neon-purple">Phạt</span>',
    tag: "2.500 thử thách × 👑 Chế độ Vua × Giọng MC",
    free: "＼ Chơi MIỄN PHÍ ngay bây giờ! ／",
    start: "🎰 CHƠI NGAY",
    premiumHeading: "✨ Phiên bản Premium (sắp ra mắt)",
    packs: {
      adult: "🔞 Chỉ dành cho người lớn",
      family: "👨‍👩‍👧 Gia đình",
      couple: "💑 Chế độ Cặp đôi",
      theme: "🎨 Giao diện Vòng quay",
      rig: "🃏 Chế độ Gian lận",
      romance: "💌 Gói Lãng mạn",
      online: "📡 Chế độ Online",
      post: "📮 Đăng & Chia sẻ Thử thách",
      nerutoon: "💘 Zoom Ghép đôi",
      noalcohol: "🥤 Gói Không Cồn",
      party: "🎉 Công ty/Tiệc",
      solo: "🍶 Uống Một Mình",
      kinggame: "👑 Chế độ Trò chơi Vua",
    },
    themes: { neon: "🌃 Neon", casino: "🎰 Casino", izakaya: "🏮 Quán nhậu" },
    rigTitle: "🃏 Chế độ Gian lận",
    rigDesc: "Chọn người sẽ có khả năng thắng cao hơn ở lượt quay tiếp theo",
    rigClear: "Bỏ chọn",
    rigSet: (name) => `【${name}】 giờ đây sẽ dễ thắng hơn ở lượt quay tiếp theo!`,
    rigOff: "Đã tắt chế độ gian lận",
    noticeHTML: "Vui lòng uống có trách nhiệm và chỉ khi đủ tuổi theo quy định.<br>Không bao giờ ép buộc ai uống rượu hay thực hiện thử thách.",
    setupTitle: "Thêm người chơi",
    modeMf: "Nam vs Nữ",
    modeAll: "Tất cả cùng chơi",
    teamM: "♂ Đội Nam",
    teamF: "♀ Đội Nữ",
    teamA: "🍻 Người chơi",
    placeholder: "Nhập tên",
    add: "Thêm",
    gameStart: "🎲 BẮT ĐẦU!",
    backTitle: "← Về trang chính",
    backSetup: "← Đổi người chơi",
    msgDup: "Tên này đã được đăng ký rồi",
    msgMax: "Bạn có thể đăng ký tối đa 12 người chơi",
    msgNeedMf: "Thêm ít nhất 1 nam, 1 nữ và tổng cộng 3 người chơi",
    msgNeedAll: "Thêm ít nhất 3 người chơi",
    coupleTeaser: "Chỉ có hai người thôi à? Hãy thử Chế độ Cặp đôi! Đây là nội dung premium.",
    packTeaser: (packName) => `"${packName}" là nội dung của phiên bản premium.`,
    spiceLabel: "🌶️ Mức độ Nóng bỏng",
    spiceLocked: "Mức 3 trở lên được mở khóa trong phiên bản premium.",
    modalTitle: "✨ Phiên bản Premium ✨",
    modalPrice: "Thanh toán một lần ₫39.000 (sắp ra mắt!)",
    modalClose: "Đóng",
    voices: {
      random: "🎲 Giọng ngẫu nhiên (đổi mỗi lần)",
      mc: "🎤 MC tiêu chuẩn",
      oyaji: "👨 Giọng nam trầm ấm",
      girl: "👧 Giọng nữ dễ thương",
    },
    voiceSample: {
      mc: "Tôi sẽ đọc thử thách!",
      oyaji: "Để tôi đọc cho.",
      girl: "Mình đọc nhé!",
    },
    bgmOn: "🎷 Nhạc Jazz BẬT",
    bgmOff: "🎷 Nhạc Jazz TẮT",
    statusStart: "🎯 Ai sẽ nhận thử thách đây...!?",
    spinTaunt: "😈 Sẽ là ai đây...!?",
    spinBtn: "🎰 QUAY VÒNG QUAY!",
    statusPicked: (name) => `Là... 【${name}】!`,
    statusOdai: "🔥 THỬ THÁCH ĐÂY RỒI!",
    statusKing: "👑 VUA ĐÃ XUẤT HIỆN!",
    kingCard: (name, targets, showReminder) => {
      const base = targets && targets.length
        ? `👑 VUA ĐÃ XUẤT HIỆN!\n\nVua là 【${name}】!\nHãy ra lệnh phạt cho 【${targets.join(" và ")}】!`
        : `👑 VUA ĐÃ XUẤT HIỆN!\n\nVua là 【${name}】!\n\nMệnh lệnh của Vua là tuyệt đối!\nHãy tự do ra lệnh cho mọi người!`;
      return showReminder ? `${base}\n\n⚠️ Giữ an toàn: không tôn giáo/chính trị, không ép uống rượu, chỉ chạm nhẹ nhàng, không chê ngoại hình, ai cũng có thể bỏ qua bất cứ lúc nào.` : base;
    },
    kingSpeech: (name, targets) =>
      targets && targets.length
        ? `Vua là ${name}! Hãy ra lệnh phạt cho ${targets.join(" và ")}!`
        : `Vua là ${name}! Mệnh lệnh của Vua là tuyệt đối! Hãy tự do ra lệnh cho mọi người!`,
    judgeAnnounce: (name) => `🧑‍⚖️ Giám khảo vòng này là 【${name}】!\n\n`,
    judgeAnnounceSpeech: (name) => `Giám khảo vòng này là ${name}!`,
    speak: "🔊 Đọc lại",
    pass: "🔄 Bỏ qua (thử thách mới)",
    share: "📤 Chia sẻ",
    shareCopied: "Đã sao chép liên kết!",
    copyShareTitle: "📋 Đã sao chép!",
    copyShareText: (app) => `Đã sao chép văn bản chia sẻ! Khi ${app} mở ra, chỉ cần dán và đăng thôi!`,
    copyShareOpen: (app) => `Mở ${app}`,
    copyShareClose: "Để sau",
    shareAppText: "🎰 Vòng Quay Phạt - trò chơi thử thách tiệc tùng đỉnh cao!",
    shareOdaiText: (text) => text, // không thêm hashtag khi chia sẻ 1:1 (hashtag của X được thêm riêng trong shareToX())
    shareOnX: "Chia sẻ trên X",
    next: "🎰 LƯỢT QUAY TIẾP THEO!",
    ceremonyTitle: (n) => `🏆 KẾT QUẢ ĐẾN LÚC NÀY! (${n} lượt)`,
    ceremonyKing: (name, count) => `👑 Vua của đêm nay: 【${name}】 (${count} lần)`,
    ceremonyChallenge: (name, count) => `🎯 Nhận nhiều thử thách nhất: 【${name}】 (${count} lần)`,
    ceremonyNoKing: "👑 Chưa có Vua nào xuất hiện",
    ceremonyContinue: "🎉 Tiếp tục",
    bgmGenres: { jazz: "🎷 Jazz", edm: "🎧 EDM", enka: "🎤 Enka" },
    romanceOn: "💌 Đã chuyển sang Gói Lãng mạn",
    romanceOff: "🎲 Đã quay lại gói tiêu chuẩn",
    adultOn: "🔞 Đã chuyển sang Gói Chỉ dành cho người lớn",
    adultOff: "🎲 Đã quay lại gói tiêu chuẩn",
    nerutoonOn: "💘 Đã chuyển sang Chế độ Zoom Ghép đôi",
    nerutoonOff: "🎲 Đã quay lại gói tiêu chuẩn",
    familyOn: "👨‍👩‍👧 Đã chuyển sang Gói Gia Đình",
    familyOff: "🎲 Đã quay lại gói tiêu chuẩn",
    coupleOn: "💑 Đã chuyển sang Chế độ 1-đối-1",
    coupleOff: "🎲 Đã quay lại gói tiêu chuẩn",
    partyOn: "🎉 Gói Công Ty/Tiệc Bật",
    partyOff: "🎉 Gói Công Ty/Tiệc Tắt",
    noalcoholOn: "🥤 Đã chuyển sang Gói Không Cồn",
    noalcoholOff: "🎲 Đã quay lại gói tiêu chuẩn",
    soloOn: "🍶 Đã chuyển sang Chế độ Uống Một Mình",
    soloOff: "🎲 Đã quay lại gói tiêu chuẩn",
    kinggameOn: "👑 Đã chuyển sang Chế độ Trò chơi Vua",
    kinggameOff: "🎲 Đã quay lại gói tiêu chuẩn",
    kinggameDisclaimerTitle: "👑 Luật Tuyệt Đối Của Vua / Lưu Ý",
    kinggameDisclaimerDesc: "Nghiêm cấm tuyệt đối việc lăng mạ xúc phạm nhân phẩm, ép ăn uống quá mức, hoặc bất cứ điều gì gây tổn hại đến cơ thể. Dù là Vua cũng phải giữ chừng mực, chỉ ra lệnh trong phạm vi khiến mọi người đều vui vẻ. Ứng dụng này không chịu trách nhiệm về bất kỳ rắc rối hay chấn thương nào. Hãy chơi vui vẻ và an toàn!",
    kinggameDisclaimerAgree: "Đồng ý & Bắt đầu",
    kinggameDisclaimerCancel: "Thôi để sau",
    kinggameNotice: "👑 Trong Chế độ Trò chơi Vua, \"Vua\" sẽ tự nghĩ ra hình phạt ngay tại chỗ. Vì điều này phụ thuộc vào bối cảnh văn hóa chung, chế độ này chỉ dành cho khách nói tiếng Nhật. Nếu bạn đến từ nước ngoài, vui lòng không nhấn vào nút này. Xin cảm ơn!",
    recModeOn: "🎬 Đã bật Chế độ Quay phim (chuyển sang giao diện tối ưu cho quay video)",
    recModeOff: "🎬 Đã tắt Chế độ Quay phim",
    viralTitle: "🚀 Bộ Công Cụ Đăng Bài Viral",
    viralDesc: "Sau khi quay video, chỉ cần sao chép và dán nội dung này vào bài đăng của bạn.",
    viralRegenerate: "🔄 Thử câu khác",
    viralScript: "① Nhập tên → ② Quay vòng quay → ③ Quay lại phản ứng ngay lúc thử thách được công bố (đây là khoảnh khắc đắt giá nhất)",
    viralCopyAll: "📋 Sao chép tất cả",
    viralCopyShortUrl: "🔗 Sao chép URL rút gọn",
    viralShortening: "Đang rút gọn…",
    viralShortUrlCopied: (url) => `Đã sao chép! ${url}`,
    viralShortUrlFallback: "Rút gọn thất bại, đã sao chép liên kết thông thường thay thế",
    viralClose: "Đóng",
    viralFooter: "📮 Gắn thẻ #BatsuRoulette khi đăng bài nhé! Video hay có thể được trang chính thức giới thiệu!",
    agegateTitle: "🔞 Xác nhận độ tuổi",
    agegateDesc: "Gói Chỉ dành cho người lớn bao gồm các thử thách có tiếp xúc cơ thể nhẹ nhàng giữa hai người. Vui lòng chỉ tiếp tục nếu bạn từ 18 tuổi trở lên.",
    agegateYes: "Tôi từ 18 tuổi trở lên",
    agegateNo: "Thôi để sau",
    upgradeBtn: "💎 Nâng cấp ngay",
    upgradeNotConfigured: "Thanh toán chưa được thiết lập. Vui lòng quay lại sau.",
    unlockedTitle: "✨ Đã kích hoạt Phiên bản Premium!",
    unlockedDesc: "Cảm ơn bạn đã mua! Toàn bộ nội dung premium — Gói Chỉ dành cho người lớn, Chế độ Gian lận, giao diện vòng quay và hơn thế nữa — đã được mở khóa. Cạn ly! 🍻",
    unlockedClose: "Bắt đầu thôi",
    subTitle: "📮 Đăng & Chia sẻ Thử thách",
    subDesc: "Gửi một thử thách gốc mà bạn nghĩ ra. Sau khi vượt qua kiểm duyệt tự động và xét duyệt, nó sẽ được chia sẻ với những người dùng khác (vui lòng không bao gồm thông tin cá nhân hoặc lời lẽ xúc phạm).",
    subPlaceholder: "vd: bắt chước người nổi tiếng yêu thích của bạn",
    subPostBtn: "Gửi",
    subListTitle: "🌟 Thử thách từ Cộng đồng",
    subEmpty: "Chưa có bài đăng nào. Hãy là người đầu tiên!",
    subSpeak: "🔊 Đọc to",
    subReport: "🚩 Báo cáo",
    subClose: "Đóng",
    subPostedPending: "Đã gửi! Sẽ được chia sẻ với mọi người sau khi xét duyệt.",
    subRejectedNgWord: "Xin lỗi, nội dung này không thể đăng được (chứa nội dung không phù hợp).",
    subRejectedEmpty: "Vui lòng nhập nội dung thử thách.",
    subRejectedTooLong: "Vui lòng nhập trong vòng 200 ký tự.",
    subNotConfigured: "Tính năng đăng & chia sẻ chưa được thiết lập.",
    subReported: "Đã báo cáo. Cảm ơn bạn đã giúp đỡ.",
    adminTitle: "🛡️ Bài đăng đang chờ duyệt",
    adminApprove: "✅ Duyệt",
    adminReject: "❌ Từ chối",
    adminEmpty: "Không có bài đăng nào đang chờ duyệt.",
    adminClose: "Đóng",
    achTitle: "🏆 Thành tích",
    achClose: "Đóng",
    helpClose: "Đóng",
    achUnlocked: (name) => `🏅 Đã mở khóa thành tích: ${name}!`,
    helpTitle: "❓ Chức năng của các biểu tượng",
    helpItems: [
      "Bật/tắt nhạc nền", "Đổi thể loại nhạc nền", "Đổi giọng đọc", "Đổi ngôn ngữ hiển thị",
      "Giao diện vòng quay (premium)", "Xem lại kết quả trước đó", "Danh sách huy hiệu thành tích", "Đăng & xem bài của mọi người",
      "Chia sẻ ứng dụng", "Chia sẻ trên X", "Chia sẻ trên WhatsApp", "Chia sẻ trên Telegram", "Chia sẻ trên Instagram",
      "Chia sẻ trên WeChat", "Chế độ quay khoảnh khắc nổi bật", "Bộ công cụ đăng mạng xã hội", "Lấy link giới thiệu bạn bè",
    ],
    hlTitle: "📸 Khoảnh khắc nổi bật đêm nay",
    hlEmpty: "Chưa có khoảnh khắc nào được lưu. Chúng sẽ tự động được lưu khi một thử thách được công bố.",
    hlClose: "Đóng",
    onlineTitle: "📡 Chế độ Tiệc Online",
    onlineDesc: "Chơi cùng những người ở nơi khác, ví dụ như qua cuộc gọi Zoom",
    onlineCreateBtn: "🖥️ Tạo phòng (chủ trì)",
    onlineJoinPlaceholder: "Mã 4 chữ số",
    onlineJoinBtn: "Tham gia",
    onlineClose: "Đóng",
    onlineNotConfigured: "Chế độ online chưa được thiết lập. Vui lòng xem \"Cách thiết lập chế độ online\" trong tài liệu yêu cầu.",
    onlineRoomCreated: (code) => `Đã tạo phòng! Chia sẻ mã "${code}" với bạn bè qua chat Zoom, v.v.`,
    onlineInvalidCode: "Vui lòng nhập mã gồm 4 chữ số",
    onlineJoinFailed: "Không tìm thấy phòng đó",
    onlineGuestTitle: "📡 Đang chờ…",
    onlineGuestWaiting: (code) => `Mã phòng: ${code}\nĐang chờ chủ trì quay vòng quay…`,
    onlineHostBadge: (code) => `📡 Phòng: ${code} (chia sẻ mã này với người tham gia)`,
    onlineLeave: "← Rời đi",
  },
  de: {
    langName: "Deutsch",
    sub: "Der ultimative Partystarter",
    logoHTML: 'Batsu <span class="neon-purple">Roulette</span>',
    tag: "2.500 Aufgaben × 👑 König-Modus × Moderatorenstimme",
    free: "＼ Jetzt KOSTENLOS spielen! ／",
    start: "🎰 JETZT SPIELEN",
    premiumHeading: "✨ Premium (bald verfügbar)",
    packs: {
      adult: "🔞 Nur für Erwachsene",
      family: "👨‍👩‍👧 Familie",
      couple: "💑 Paar-Modus",
      theme: "🎨 Roulette-Designs",
      rig: "🃏 Schummel-Modus",
      romance: "💌 Romantik-Paket",
      online: "📡 Online-Modus",
      post: "📮 Aufgaben posten & teilen",
      nerutoon: "💘 Speed-Dating Zoom",
      noalcohol: "🥤 Alkoholfreies Paket",
      party: "🎉 Firmen-/Partypaket",
      solo: "🍶 Alleine trinken",
      kinggame: "👑 König-Spiel-Modus",
    },
    themes: { neon: "🌃 Neon", casino: "🎰 Casino", izakaya: "🏮 Izakaya" },
    rigTitle: "🃏 Schummel-Modus",
    rigDesc: "Wähle aus, wer beim nächsten Dreh eher gewinnen soll",
    rigClear: "Zurücksetzen",
    rigSet: (name) => `【${name}】 gewinnt jetzt mit höherer Wahrscheinlichkeit beim nächsten Dreh!`,
    rigOff: "Schummel-Modus zurückgesetzt",
    noticeHTML: "Bitte trinke verantwortungsvoll und nur, wenn du das gesetzliche Mindestalter hast.<br>Niemanden zum Trinken oder zu einer Aufgabe zwingen.",
    setupTitle: "Spieler hinzufügen",
    modeMf: "Jungs gegen Mädels",
    modeAll: "Alle zusammen",
    teamM: "♂ Team Jungs",
    teamF: "♀ Team Mädels",
    teamA: "🍻 Spieler",
    placeholder: "Name eingeben",
    add: "Hinzufügen",
    gameStart: "🎲 SPIEL STARTEN!",
    backTitle: "← Zurück zum Titel",
    backSetup: "← Spieler ändern",
    msgDup: "Dieser Name ist bereits registriert",
    msgMax: "Du kannst bis zu 12 Spieler registrieren",
    msgNeedMf: "Füge mindestens 1 Jungen, 1 Mädchen und insgesamt 3 Spieler hinzu",
    msgNeedAll: "Füge mindestens 3 Spieler hinzu",
    coupleTeaser: "Nur zu zweit? Probiere den Paar-Modus – Teil der Premium-Version!",
    packTeaser: (packName) => `„${packName}“ ist Teil der Premium-Version.`,
    spiceLabel: "🌶️ Würze-Level",
    spiceLocked: "Level 3 und höher sind in der Premium-Version freigeschaltet.",
    modalTitle: "✨ Premium-Version ✨",
    modalPrice: "Einmaliger Kauf 3,99 € (demnächst verfügbar!)",
    modalClose: "Schließen",
    voices: {
      random: "🎲 Überraschungsstimme (wechselt jedes Mal)",
      mc: "🎤 Standard-Moderator",
      oyaji: "👨 Tiefe Opa-Stimme",
      girl: "👧 Niedliche Mädchenstimme",
    },
    voiceSample: {
      mc: "Ich lese die Aufgaben vor!",
      oyaji: "Ich werde sie für dich vorlesen.",
      girl: "Ich lese sie vor, los geht's!",
    },
    bgmOn: "🎷 Jazz-Musik AN",
    bgmOff: "🎷 Jazz-Musik AUS",
    statusStart: "🎯 Wer bekommt die Aufgabe...!?",
    spinTaunt: "😈 Wer wird es sein...!?",
    spinBtn: "🎰 RAD DREHEN!",
    statusPicked: (name) => `Es ist... 【${name}】!`,
    statusOdai: "🔥 HIER IST DIE AUFGABE!",
    statusKing: "👑 ALLE VERNEIGEN SICH VOR DEM KÖNIG!",
    kingCard: (name, targets, showReminder) => {
      const base = targets && targets.length
        ? `👑 ALLE VERNEIGEN SICH VOR DEM KÖNIG!\n\nDer König ist 【${name}】!\nBefiehl eine Strafe für 【${targets.join(" und ")}】!`
        : `👑 ALLE VERNEIGEN SICH VOR DEM KÖNIG!\n\nDer König ist 【${name}】!\n\nDer Befehl des Königs ist absolut!\nDenk dir jede beliebige Aufgabe aus!`;
      return showReminder ? `${base}\n\n⚠️ Sicher bleiben: keine Religion/Politik, kein Trinkzwang, nur sanfte Berührungen, keine Witze über das Aussehen, jeder kann jederzeit passen.` : base;
    },
    kingSpeech: (name, targets) =>
      targets && targets.length
        ? `Der König ist ${name}! Befiehl eine Strafe für ${targets.join(" und ")}!`
        : `Der König ist ${name}! Der Befehl des Königs ist absolut! Denk dir jede beliebige Aufgabe aus!`,
    judgeAnnounce: (name) => `🧑‍⚖️ Der Richter dieser Runde ist 【${name}】!\n\n`,
    judgeAnnounceSpeech: (name) => `Der Richter dieser Runde ist ${name}!`,
    speak: "🔊 Nochmal vorlesen",
    pass: "🔄 Passen (neue Aufgabe)",
    share: "📤 Teilen",
    shareCopied: "Link kopiert!",
    copyShareTitle: "📋 Kopiert!",
    copyShareText: (app) => `Dein Text zum Teilen wurde kopiert! Öffne ${app} und füge ihn einfach ein!`,
    copyShareOpen: (app) => `${app} öffnen`,
    copyShareClose: "Später",
    shareAppText: "🎰 Batsu Roulette – das ultimative Party-Aufgabenspiel!",
    shareOdaiText: (text) => text,
    shareOnX: "Auf X teilen",
    next: "🎰 NÄCHSTE DREHUNG!",
    ceremonyTitle: (n) => `🏆 ZWISCHENSTAND! (${n} Runden)`,
    ceremonyKing: (name, count) => `👑 König des Abends: 【${name}】 (${count}x)`,
    ceremonyChallenge: (name, count) => `🎯 Meiste Aufgaben: 【${name}】 (${count}x)`,
    ceremonyNoKing: "👑 Noch kein König gekürt",
    ceremonyContinue: "🎉 Weiter",
    bgmGenres: { jazz: "🎷 Jazz", edm: "🎧 EDM", enka: "🎤 Enka" },
    romanceOn: "💌 Zum Romantik-Paket gewechselt",
    romanceOff: "🎲 Zurück zum Standard-Paket",
    adultOn: "🔞 Zum Erwachsenen-Paket gewechselt",
    adultOff: "🎲 Zurück zum Standard-Paket",
    nerutoonOn: "💘 Zum Speed-Dating Zoom-Modus gewechselt",
    nerutoonOff: "🎲 Zurück zum Standard-Paket",
    familyOn: "👨‍👩‍👧 Zum Familien-Paket gewechselt",
    familyOff: "🎲 Zurück zum Standard-Paket",
    coupleOn: "💑 Zum 1-zu-1-Modus gewechselt",
    coupleOff: "🎲 Zurück zum Standard-Paket",
    partyOn: "🎉 Firmen-/Party-Plan Ein",
    partyOff: "🎉 Firmen-/Party-Plan Aus",
    noalcoholOn: "🥤 Zum alkoholfreien Paket gewechselt",
    noalcoholOff: "🎲 Zurück zum Standard-Paket",
    soloOn: "🍶 Zum Modus „Alleine trinken“ gewechselt",
    soloOff: "🎲 Zurück zum Standard-Paket",
    kinggameOn: "👑 Zum König-Spiel-Modus gewechselt",
    kinggameOff: "🎲 Zurück zum Standard-Paket",
    kinggameDisclaimerTitle: "👑 Die absoluten Regeln des Königs / Hinweis",
    kinggameDisclaimerDesc: "Beleidigungen, die die Menschenwürde missachten, das Erzwingen von übermäßigem Essen oder Trinken sowie alles, was körperlichen Schaden verursachen könnte, sind strengstens verboten. Auch der König muss Maß halten — gib nur Befehle, bei denen alle lächeln können. Diese App übernimmt keine Verantwortung für Ärger oder Verletzungen. Spielt sicher und habt Spaß!",
    kinggameDisclaimerAgree: "Zustimmen & Starten",
    kinggameDisclaimerCancel: "Lieber nicht",
    kinggameNotice: "👑 Im König-Spiel-Modus denkt sich der \"König\" die Strafen spontan aus. Da dies von einem gemeinsamen kulturellen Kontext abhängt, ist dieser Modus nur für japanischsprachige Gäste gedacht. Wenn Sie aus dem Ausland zu Besuch sind, tippen Sie bitte nicht auf diese Schaltfläche. Danke!",
    recModeOn: "🎬 REC-Modus AN (filmfreundliche Ansicht aktiviert)",
    recModeOff: "🎬 REC-Modus AUS",
    viralTitle: "🚀 Viral-Post-Kit",
    viralDesc: "Sobald du einen Clip gefilmt hast, kopiere das hier einfach direkt in deinen Post.",
    viralRegenerate: "🔄 Anderen Vorschlag",
    viralScript: "① Namen eingeben → ② Rad drehen → ③ Die Reaktion filmen, sobald die Aufgabe erscheint (das ist der beste Moment)",
    viralCopyAll: "📋 Alles kopieren",
    viralCopyShortUrl: "🔗 Kurzlink kopieren",
    viralShortening: "Wird gekürzt…",
    viralShortUrlCopied: (url) => `Kopiert! ${url}`,
    viralShortUrlFallback: "Kürzen fehlgeschlagen, stattdessen wurde der normale Link kopiert",
    viralClose: "Schließen",
    viralFooter: "📮 Poste mit #BatsuRoulette – die besten Videos werden vielleicht vorgestellt!",
    agegateTitle: "🔞 Altersverifizierung",
    agegateDesc: "Das Erwachsenen-Paket enthält Aufgaben mit leichter körperlicher Zuneigung zwischen Partnern. Bitte nur fortfahren, wenn du mindestens 18 Jahre alt bist.",
    agegateYes: "Ich bin 18 oder älter",
    agegateNo: "Abbrechen",
    upgradeBtn: "💎 Jetzt upgraden",
    upgradeNotConfigured: "Zahlungen sind noch nicht eingerichtet. Bitte schau bald wieder vorbei.",
    unlockedTitle: "✨ Premium freigeschaltet!",
    unlockedDesc: "Danke für deinen Kauf! Alle Premium-Inhalte – das Erwachsenen-Paket, der Schummel-Modus, Roulette-Designs und mehr – sind jetzt freigeschaltet. Prost! 🍻",
    unlockedClose: "Los geht's",
    subTitle: "📮 Aufgaben posten & teilen",
    subDesc: "Reiche eine eigene Aufgabe ein, die du dir ausgedacht hast. Nach automatischer Prüfung und Freigabe wird sie mit anderen Nutzern geteilt (bitte keine persönlichen Daten oder Beleidigungen).",
    subPlaceholder: "z. B. mach eine Imitation deines Lieblingspromis",
    subPostBtn: "Einreichen",
    subListTitle: "🌟 Community-Aufgaben",
    subEmpty: "Noch keine Einreichungen. Sei der/die Erste!",
    subSpeak: "🔊 Vorlesen",
    subReport: "🚩 Melden",
    subClose: "Schließen",
    subPostedPending: "Eingereicht! Wird nach Prüfung mit allen geteilt.",
    subRejectedNgWord: "Entschuldigung, das kann nicht gepostet werden (enthält unangemessene Inhalte).",
    subRejectedEmpty: "Bitte gib eine Aufgabe ein.",
    subRejectedTooLong: "Bitte halte dich unter 200 Zeichen.",
    subNotConfigured: "Die Posten & Teilen-Funktion ist noch nicht eingerichtet.",
    subReported: "Gemeldet. Danke, dass du hilfst, alles sicher zu halten.",
    adminTitle: "🛡️ Ausstehende Einreichungen",
    adminApprove: "✅ Genehmigen",
    adminReject: "❌ Ablehnen",
    adminEmpty: "Keine Einreichungen zur Prüfung.",
    adminClose: "Schließen",
    achTitle: "🏆 Erfolge",
    achClose: "Schließen",
    helpClose: "Schließen",
    achUnlocked: (name) => `🏅 Erfolg freigeschaltet: ${name}!`,
    helpTitle: "❓ Was die Symbole bedeuten",
    helpItems: [
      "Hintergrundmusik ein/aus", "Musikgenre wechseln", "Vorlesestimme wechseln", "Sprache wechseln",
      "Roulette-Design (Premium)", "Frühere Ergebnisse ansehen", "Erfolgsabzeichen", "Beiträge posten & ansehen",
      "App teilen", "Auf X teilen", "Auf WhatsApp teilen", "Auf Telegram teilen", "Auf Instagram teilen",
      "Auf WeChat teilen", "Aufnahmemodus für Highlights", "Social-Media-Kit", "Empfehlungslink erhalten",
    ],
    hlTitle: "📸 Highlights des Abends",
    hlEmpty: "Noch keine Highlights. Sie werden automatisch gespeichert, wenn eine Aufgabe angezeigt wird.",
    hlClose: "Schließen",
    onlineTitle: "📡 Online-Party-Modus",
    onlineDesc: "Spiele zusammen mit Leuten an anderen Orten, z. B. über einen Zoom-Call",
    onlineCreateBtn: "🖥️ Raum erstellen (Host)",
    onlineJoinPlaceholder: "4-stelliger Code",
    onlineJoinBtn: "Beitreten",
    onlineClose: "Schließen",
    onlineNotConfigured: "Der Online-Modus ist noch nicht eingerichtet. Siehe „Online-Modus-Einrichtung“ im Anforderungsdokument.",
    onlineRoomCreated: (code) => `Raum erstellt! Teile den Code „${code}“ mit deinen Freunden, z. B. im Zoom-Chat.`,
    onlineInvalidCode: "Bitte gib einen 4-stelligen Code ein",
    onlineJoinFailed: "Dieser Raum konnte nicht gefunden werden",
    onlineGuestTitle: "📡 Warten…",
    onlineGuestWaiting: (code) => `Raum-Code: ${code}\nWarte darauf, dass der Host das Rad dreht…`,
    onlineHostBadge: (code) => `📡 Raum: ${code} (teile diesen Code mit Gästen)`,
    onlineLeave: "← Verlassen",
  },
  tl: {
    langName: "Tagalog",
    sub: "Ang pinaka-explosive na party starter",
    logoHTML: 'Batsu <span class="neon-purple">Roulette</span>',
    tag: "2,500 na hamon × 👑 King Mode × MC voice",
    free: "＼ Maglaro ng LIBRE ngayon! ／",
    start: "🎰 SIMULAN NA",
    premiumHeading: "✨ Premium (malapit na)",
    packs: {
      adult: "🔞 Adults Only",
      family: "👨‍👩‍👧 Pamilya",
      couple: "💑 Couple Mode",
      theme: "🎨 Roulette Themes",
      rig: "🃏 Rig Mode",
      romance: "💌 Romance Pack",
      online: "📡 Online Mode",
      post: "📮 I-post ang Hamon",
      nerutoon: "💘 Matchmaking Zoom",
      noalcohol: "🥤 Non-Alcohol Pack",
      party: "🎉 Corporate/Party",
      solo: "🍶 Solo Inuman",
      kinggame: "👑 King Game Mode",
    },
    themes: { neon: "🌃 Neon", casino: "🎰 Casino", izakaya: "🏮 Izakaya" },
    rigTitle: "🃏 Rig Mode",
    rigDesc: "Piliin kung sino ang mas malaking chance na manalo sa susunod na ikot",
    rigClear: "I-clear",
    rigSet: (name) => `Mas malaki na ang chance na manalo ni 【${name}】 sa susunod na ikot!`,
    rigOff: "Na-clear na ang rig mode",
    noticeHTML: "Uminom nang responsable at kung legal age ka lang.<br>Huwag pilitin ang sinuman na uminom o gumawa ng hamon.",
    setupTitle: "Magdagdag ng Players",
    modeMf: "Lalaki vs Babae",
    modeAll: "Sabay-sabay lahat",
    teamM: "♂ Team Lalaki",
    teamF: "♀ Team Babae",
    teamA: "🍻 Mga Players",
    placeholder: "I-type ang pangalan",
    add: "Idagdag",
    gameStart: "🎲 SIMULAN ANG LARO!",
    backTitle: "← Bumalik sa title",
    backSetup: "← Palitan ang players",
    msgDup: "Naka-register na ang pangalang ito",
    msgMax: "Hanggang 12 players lang ang pwedeng i-register",
    msgNeedMf: "Magdagdag ng kahit 1 lalaki, 1 babae, at 3 players lahat-lahat",
    msgNeedAll: "Magdagdag ng kahit 3 players",
    coupleTeaser: "Kayong dalawa lang? Subukan ang Couple Mode — bahagi ng premium version!",
    packTeaser: (packName) => `Bahagi ng premium version ang "${packName}".`,
    spiceLabel: "🌶️ Spice Level",
    spiceLocked: "Level 3 pataas ay bukas na sa premium version.",
    modalTitle: "✨ Premium Version ✨",
    modalPrice: "Isang beses na bayad ₱199 (malapit na!)",
    modalClose: "Isara",
    voices: {
      random: "🎲 Random na boses (nagbabago tuwing round)",
      mc: "🎤 Standard MC",
      oyaji: "👨 Malalim na boses ng lolo",
      girl: "👧 Cute na boses ng babae",
    },
    voiceSample: {
      mc: "Ako ang magbabasa ng hamon!",
      oyaji: "Ako na ang babasa niyan para sa inyo.",
      girl: "Ako ang babasa, tara na!",
    },
    bgmOn: "🎷 Jazz BGM ON",
    bgmOff: "🎷 Jazz BGM OFF",
    statusStart: "🎯 Sino kaya ang matatamaan...!?",
    spinTaunt: "😈 Sino kaya...!?",
    spinBtn: "🎰 IKUTIN ANG GULONG!",
    statusPicked: (name) => `Ito na... si 【${name}】!`,
    statusOdai: "🔥 ETO NA ANG HAMON!",
    statusKing: "👑 MABUHAY ANG HARI!",
    kingCard: (name, targets, showReminder) => {
      const base = targets && targets.length
        ? `👑 MABUHAY ANG HARI!\n\nAng Hari ay si 【${name}】!\nMag-utos ng parusa para kay 【${targets.join(" at ")}】!`
        : `👑 MABUHAY ANG HARI!\n\nAng Hari ay si 【${name}】!\n\nAbsolute ang utos ng Hari!\nGumawa ng kahit anong hamon!`;
      return showReminder ? `${base}\n\n⚠️ Manatiling ligtas: bawal ang relihiyon/politika, walang sapilitang inuman, magaan na hipo lang, bawal ang panlalait sa hitsura, pwedeng mag-pass kahit kailan.` : base;
    },
    kingSpeech: (name, targets) =>
      targets && targets.length
        ? `Ang Hari ay si ${name}! Mag-utos ng parusa para kay ${targets.join(" at ")}!`
        : `Ang Hari ay si ${name}! Absolute ang utos ng Hari! Gumawa ng kahit anong hamon!`,
    judgeAnnounce: (name) => `🧑‍⚖️ Ang huwes ngayong round ay si 【${name}】!\n\n`,
    judgeAnnounceSpeech: (name) => `Ang huwes ngayong round ay si ${name}!`,
    speak: "🔊 Ulitin ang pagbasa",
    pass: "🔄 Pass (bagong hamon)",
    share: "📤 I-share",
    shareCopied: "Na-copy ang link!",
    copyShareTitle: "📋 Na-copy!",
    copyShareText: (app) => `Na-copy na ang text mo! Pag nabuksan ang ${app}, i-paste mo lang at i-post!`,
    copyShareOpen: (app) => `Buksan ang ${app}`,
    copyShareClose: "Mamaya na lang",
    shareAppText: "🎰 Batsu Roulette - ang pinaka-explosive na party dare game!",
    shareOdaiText: (text) => text,
    shareOnX: "I-share sa X",
    next: "🎰 SUSUNOD NA IKOT!",
    ceremonyTitle: (n) => `🏆 RESULTA SA NGAYON! (${n} rounds)`,
    ceremonyKing: (name, count) => `👑 Hari ng Gabi: 【${name}】 (${count}x)`,
    ceremonyChallenge: (name, count) => `🎯 Pinakamaraming Hamon: 【${name}】 (${count}x)`,
    ceremonyNoKing: "👑 Wala pang lumalabas na Hari",
    ceremonyContinue: "🎉 Ituloy",
    bgmGenres: { jazz: "🎷 Jazz", edm: "🎧 EDM", enka: "🎤 Enka" },
    romanceOn: "💌 Napalitan sa Romance Pack",
    romanceOff: "🎲 Bumalik sa Standard Pack",
    adultOn: "🔞 Napalitan sa Adults Only Pack",
    adultOff: "🎲 Bumalik sa Standard Pack",
    nerutoonOn: "💘 Napalitan sa Matchmaking Zoom Mode",
    nerutoonOff: "🎲 Bumalik sa Standard Pack",
    familyOn: "👨‍👩‍👧 Napalitan sa Family Pack",
    familyOff: "🎲 Bumalik sa Standard Pack",
    coupleOn: "💑 Napalitan sa 1-on-1 Mode",
    coupleOff: "🎲 Bumalik sa Standard Pack",
    partyOn: "🎉 Naka-on ang Corporate/Party Plan",
    partyOff: "🎉 Naka-off ang Corporate/Party Plan",
    noalcoholOn: "🥤 Napalitan sa Non-Alcohol Pack",
    noalcoholOff: "🎲 Bumalik sa Standard Pack",
    soloOn: "🍶 Napalitan sa Solo Inuman Mode",
    soloOff: "🎲 Bumalik sa Standard Pack",
    kinggameOn: "👑 Napalitan sa King Game Mode",
    kinggameOff: "🎲 Bumalik sa Standard Pack",
    kinggameDisclaimerTitle: "👑 Mga Absolutong Panuntunan ng Hari / Paalala",
    kinggameDisclaimerDesc: "Mahigpit na ipinagbabawal ang panlalait na hindi gumagalang sa dignidad ng tao, sapilitang labis na pag-inom o pagkain, at anumang maaaring makasakit sa katawan. Kahit ang Hari ay dapat magpakita ng kontrol — mag-utos lang ng bagay na magpapangiti sa lahat. Ang app na ito ay walang pananagutan sa anumang gulo o injury. Mag-enjoy nang ligtas!",
    kinggameDisclaimerAgree: "Sumang-ayon at Simulan",
    kinggameDisclaimerCancel: "Huwag na lang",
    kinggameNotice: "👑 Sa King Game Mode, ang \"Hari\" ay gumagawa ng parusa nang biglaan. Dahil nakadepende ito sa magkatulad na kultural na konteksto, para lang ito sa mga Japanese-speaking na bisita. Kung galing ka sa ibang bansa, mangyaring huwag pindutin ang button na ito. Salamat!",
    recModeOn: "🎬 REC Mode ON (napalitan sa view na okay para sa paggawa ng video)",
    recModeOff: "🎬 REC Mode OFF",
    viralTitle: "🚀 Viral Post Kit",
    viralDesc: "Pagkatapos mong mag-video, i-copy-paste lang ito diretso sa post mo.",
    viralRegenerate: "🔄 Ibang idea",
    viralScript: "① I-type ang pangalan → ② Ikutin ang gulong → ③ I-video ang reaction pagkalabas ng hamon (yan ang money shot)",
    viralCopyAll: "📋 I-copy lahat",
    viralCopyShortUrl: "🔗 I-copy ang short URL",
    viralShortening: "Ginagawang short…",
    viralShortUrlCopied: (url) => `Na-copy! ${url}`,
    viralShortUrlFallback: "Hindi na-shorten, kaya ang regular link na lang ang na-copy",
    viralClose: "Isara",
    viralFooter: "📮 I-tag ang post mo ng #BatsuRoulette — baka ma-feature ang pinakamagandang video!",
    agegateTitle: "🔞 Pag-verify ng Edad",
    agegateDesc: "May mga hamon ang Adults Only pack na may light physical affection sa pagitan ng partners. Magpatuloy lamang kung ikaw ay 18 taong gulang pataas.",
    agegateYes: "18 taong gulang pataas ako",
    agegateNo: "Huwag na lang",
    upgradeBtn: "💎 Mag-upgrade Ngayon",
    upgradeNotConfigured: "Hindi pa naka-set up ang payments. Bumalik na lang mamaya.",
    unlockedTitle: "✨ Premium Unlocked!",
    unlockedDesc: "Salamat sa pagbili! Lahat ng premium content — Adults Only pack, Rig Mode, roulette themes, at marami pa — bukas na ngayon. Cheers! 🍻",
    unlockedClose: "Tara na",
    subTitle: "📮 I-post ang Hamon",
    subDesc: "Mag-submit ng orihinal na hamon na naisip mo. Pagkatapos ng automatic screening at review, ishe-share ito sa ibang users (huwag maglagay ng personal info o insulto).",
    subPlaceholder: "hal. gumaya sa paborito mong celebrity",
    subPostBtn: "I-submit",
    subListTitle: "🌟 Mga Hamon ng Community",
    subEmpty: "Wala pang submissions. Ikaw na ang una!",
    subSpeak: "🔊 Basahin nang malakas",
    subReport: "🚩 I-report",
    subClose: "Isara",
    subPostedPending: "Na-submit na! Ishe-share sa lahat pagkatapos ng review.",
    subRejectedNgWord: "Pasensya, hindi ito pwedeng i-post (may hindi angkop na laman).",
    subRejectedEmpty: "Maglagay ng hamon.",
    subRejectedTooLong: "Panatilihing hindi lalampas sa 200 characters.",
    subNotConfigured: "Hindi pa naka-set up ang posting & sharing feature.",
    subReported: "Na-report na. Salamat sa pagtulong para maging safe ang lahat.",
    adminTitle: "🛡️ Mga Naghihintay na Submission",
    adminApprove: "✅ Aprubahan",
    adminReject: "❌ Tanggihan",
    adminEmpty: "Walang submissions na naghihintay ng review.",
    adminClose: "Isara",
    achTitle: "🏆 Mga Achievement",
    achClose: "Isara",
    helpClose: "Isara",
    achUnlocked: (name) => `🏅 Na-unlock ang achievement: ${name}!`,
    helpTitle: "❓ Ano ang ginagawa ng mga icon",
    helpItems: [
      "I-on/off ang BGM", "Palitan ang genre ng BGM", "Palitan ang boses sa pagbasa", "Palitan ang wika",
      "Tema ng roulette (premium)", "Balikan ang mga nakaraang resulta", "Listahan ng achievement badges", "I-post at tingnan ang mga isinumite",
      "I-share ang app", "I-share sa X", "I-share sa WhatsApp", "I-share sa Telegram", "I-share sa Instagram",
      "I-share sa WeChat", "Recording mode para sa mga highlight", "Kit para sa social media posting", "Kumuha ng referral link",
    ],
    hlTitle: "📸 Mga Highlight Ngayong Gabi",
    hlEmpty: "Wala pang highlights. Automatic itong nase-save kapag lumabas ang hamon.",
    hlClose: "Isara",
    onlineTitle: "📡 Online Party Mode",
    onlineDesc: "Maglaro kasama ang mga taong nasa ibang lugar, hal. sa Zoom call",
    onlineCreateBtn: "🖥️ Gumawa ng Room (Host)",
    onlineJoinPlaceholder: "4-digit na code",
    onlineJoinBtn: "Sumali",
    onlineClose: "Isara",
    onlineNotConfigured: "Hindi pa naka-set up ang online mode. Tingnan ang \"Online Mode Setup\" sa requirements doc.",
    onlineRoomCreated: (code) => `Nagawa na ang room! I-share ang code na "${code}" sa mga kaibigan mo sa Zoom chat, atbp.`,
    onlineInvalidCode: "Maglagay ng 4-digit na code",
    onlineJoinFailed: "Hindi mahanap ang room na iyon",
    onlineGuestTitle: "📡 Naghihintay…",
    onlineGuestWaiting: (code) => `Room code: ${code}\nHinihintay na ikutin ng host ang gulong…`,
    onlineHostBadge: (code) => `📡 Room: ${code} (i-share ang code na ito sa mga guests)`,
    onlineLeave: "← Umalis",
  },
};

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
  document.getElementById("pack-noalcohol").textContent = u.packs.noalcohol;
  document.getElementById("pack-solo").innerHTML = `${u.packs.solo} <span class="lock">🔒</span>`;
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
  updateFamilyRoleRowVisibility();
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
function setupSimplePackToggle(btn, packKey, onKey, offKey, requiresPremium) {
  PACK_TOGGLE_BUTTONS.push(btn);
  btn.addEventListener("click", () => {
    if (requiresPremium && blockIfNotPremium(packKey)) return;
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

/* ---------------- 🍶 ひとり飲みモード（有料機能） ---------------- */
const btnSolo = document.getElementById("pack-solo");
setupSimplePackToggle(btnSolo, "solo", "soloOn", "soloOff", true);

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
const HELP_ICONS = ["🎷", "🎷", "🎲", "🌐", "🎨", "📸", "🏆", "📮", "📤", "X", "💬", "✈️", "📷", "💚", "🎬", "🚀", "🔗"];

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

function updateFamilyRoleRowVisibility() {
  const row = document.getElementById("family-role-row");
  if (!row) return;
  const show = state.pack === "family" && state.mode === "all";
  row.classList.toggle("hidden", !show);
  if (show) renderFamilyRoleRow();
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

  // このスピンが王様モード／審査員ハプニングになるかどうか、先に運命を決めておく
  // 🔞大人向けパックのときだけ発動率50%＋対象者指名、それ以外は従来通り10%＋全員への自由命令
  const isAdultPack = state.pack === "adult";
  const kingRound = Math.random() < (isAdultPack ? KING_CHANCE_ADULT : KING_CHANCE_STANDARD);
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

    bumpStat(winner.name, isActualKingRound ? "king" : "challenge");
    state.roundCount++;
    state.pendingCeremony = state.roundCount % CEREMONY_INTERVAL === 0;

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
  const judgePrefix = judgeName ? t("judgeAnnounce")(judgeName) : "";
  const judgeSpeechPrefix = judgeName ? t("judgeAnnounceSpeech")(judgeName) : "";
  const finalDisplay = judgePrefix + odai.displayText;
  state.currentSpeech = judgeSpeechPrefix + odai.speechText;

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
  // 👑王様ゲームモードは無料・年齢確認等が不要なパックなので、前回選んでいれば黙って復元する
  if (localStorage.getItem(PACK_STORAGE_KEY) === "kinggame") {
    state.pack = "kinggame";
    btnKingGame.classList.add("active-pack");
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
