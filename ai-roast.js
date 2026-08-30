/* =========================================================
   🍶 飲み友AI（旧タゴサクAI・有料機能・要Vercelデプロイ）
   ---------------------------------------------------------
   ・ai-roast-config.js に書かれたVercelのAPIアドレスへユーザーの
     発言を送り、AIのコメントを受け取る
   ・エンドポイントが未設定（プレースホルダーのまま）のときは
     何も通信せず、呼び出し元に「未設定」を返すだけ
   ・AI(Groq)は無料枠を利用しているが、無料枠にも
     利用回数の上限があるため、1日あたりの発言数に上限を設けて
     使いすぎを防ぐ（端末のlocalStorageで管理する簡易的なもの）
   ・open() を呼ぶたびに ai-roast-characters.js の9人からランダムで
     1人選び、以降の会話はそのキャラクターのペルソナで返信される
     （キャラクターidをサーバー側へ送り、api/roast.js側で
     ペルソナのSYSTEM_PROMPTを切り替える仕組み）
   ========================================================= */

const AiRoast = (() => {
  // Groq無料枠は全ユーザー合計で目安1日14,400回・1分30回とかなり余裕があるため、
  // 1人あたりの上限は30回/日に設定（それでも極端な連投は防げる水準）
  const MAX_TURNS_PER_DAY = 30;
  const HISTORY_LIMIT = 12; // 直近12件（ユーザー+AI合計）だけ会話履歴として送る

  // 開発確認用のURLパラメータ（?solopremium=1）でアクセスしているときは、
  // テスト中の会話が1日の利用回数にカウントされないようにする
  // （billing.jsのSoloBillingと同じdevパラメータ名）
  const isDevTesting = new URLSearchParams(location.search).get("solopremium") === "1";

  // 🪙 1日の上限(12回)に達した後、¥100で+12回を買い切りで追加購入できる仕組み。
  // Stripeの決済リンクから戻ってきたとき(?roast_topup=1&roast_topup_session_id=...)に
  // セッションIDの形を検証し、今日の追加回数としてlocalStorageに加算する
  // （billing.jsのcreateBillingModuleと同じ検証パターン。日をまたぐと自動でリセットされる）
  const TOPUP_BONUS_TURNS = 12;
  const TOPUP_SESSION_ID_PATTERN = /^cs_(test|live)_[A-Za-z0-9]{16,}$/;

  function bonusKey() {
    return "batsu-roast-bonus-" + new Date().toISOString().slice(0, 10);
  }

  function getBonusTurns() {
    try {
      return parseInt(localStorage.getItem(bonusKey()) || "0", 10);
    } catch (e) {
      return 0;
    }
  }

  // 決済から戻った直後に1回だけ、api/verify-payment.jsへ本当に支払い済みか
  // 問い合わせる（billing.jsのverifyInBackgroundと同じ仕組み）。Stripe側で
  // 確認が取れなかった場合だけ、今回加算した分のボーナス回数を取り消す
  // （エンドポイント未設定・ネットワーク不通時は安全側に倒し、何もしない）
  function verifyTopupInBackground(sessionId) {
    if (typeof PAYMENT_VERIFY_ENDPOINT !== "string" || !PAYMENT_VERIFY_ENDPOINT) return;
    const url = `${PAYMENT_VERIFY_ENDPOINT}?session_id=${encodeURIComponent(sessionId)}&plan=roast_topup`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || data.valid !== false) return; // 明確に「不正」と判定できたときだけ取り消す
        try {
          const remaining = Math.max(0, getBonusTurns() - TOPUP_BONUS_TURNS);
          localStorage.setItem(bonusKey(), String(remaining));
        } catch (e) {}
      })
      .catch(() => {});
  }

  function handleTopupReturn() {
    const params = new URLSearchParams(location.search);
    if (params.get("roast_topup") !== "1") return;
    const sessionId = params.get("roast_topup_session_id") || "";
    if (!TOPUP_SESSION_ID_PATTERN.test(sessionId)) return;
    try {
      localStorage.setItem(bonusKey(), String(getBonusTurns() + TOPUP_BONUS_TURNS));
    } catch (e) {}
    const url = new URL(location.href);
    url.searchParams.delete("roast_topup");
    url.searchParams.delete("roast_topup_session_id");
    // ⚠️ このIIFE内には会話履歴用の変数名`history`があり、window.historyを覆い隠すため、
    // 必ずwindow.を付けて参照すること
    window.history.replaceState({}, "", url.toString());
    verifyTopupInBackground(sessionId);
  }

  function isTopupConfigured() {
    return (
      typeof STRIPE_ROAST_TOPUP_LINK === "string" &&
      STRIPE_ROAST_TOPUP_LINK.indexOf("https://buy.stripe.com/") === 0 &&
      STRIPE_ROAST_TOPUP_LINK.indexOf("YOUR_PAYMENT_LINK") === -1
    );
  }

  function openTopupCheckout() {
    if (!isTopupConfigured()) return false;
    window.open(STRIPE_ROAST_TOPUP_LINK, "_blank", "noopener");
    return true;
  }

  let history = [];
  let character = null;
  let playerName = "";

  handleTopupReturn();

  // チャットを開くたびに呼ぶ。会話履歴をリセットし、キャラクターを決める。
  // forceCharacter を渡すとそのキャラクターに固定する（例：ルーレットで既に決まっている場合）。
  // 省略時は従来通りランダムで1人選ぶ。
  // name を渡すと、キャラクターが「お前」等の代わりにその名前で呼びかけてくれる
  // （opener中の{name}の置き換え・サーバー側への送信の両方に使う）
  function open(forceCharacter, name) {
    history = [];
    character = forceCharacter || AI_ROAST_CHARACTERS[Math.floor(Math.random() * AI_ROAST_CHARACTERS.length)];
    playerName = (name || "").trim();
    return character;
  }

  // opener文中の{name}を実際のプレイヤー名に置き換えて返す（名前未設定時はそのまま「あなた」にする）
  function getOpenerText() {
    if (!character) return "";
    return character.opener.replace(/\{name\}/g, playerName || "あなた");
  }

  function todayKey() {
    return "batsu-roast-turns-" + new Date().toISOString().slice(0, 10);
  }

  function isConfigured() {
    return (
      typeof AI_ROAST_ENDPOINT === "string" &&
      AI_ROAST_ENDPOINT.indexOf("https://") === 0 &&
      AI_ROAST_ENDPOINT.indexOf("YOUR-") === -1
    );
  }

  function getTurnsUsed() {
    try {
      return parseInt(localStorage.getItem(todayKey()) || "0", 10);
    } catch (e) {
      return 0;
    }
  }

  function bumpTurnsUsed() {
    if (isDevTesting) return;
    try {
      localStorage.setItem(todayKey(), String(getTurnsUsed() + 1));
    } catch (e) {}
  }

  function quotaReached() {
    if (isDevTesting) return false;
    return getTurnsUsed() >= MAX_TURNS_PER_DAY + getBonusTurns();
  }

  function reset() {
    history = [];
  }

  // 今日の実質的な上限（基本12回＋購入した追加分）
  function getMaxTurns() {
    return MAX_TURNS_PER_DAY + getBonusTurns();
  }

  function getCharacter() {
    return character;
  }

  // 戻り値: { ok: true, reply } / { ok: false, reason: "not_configured" | "quota" | "error" }
  async function send(message) {
    if (!isConfigured()) return { ok: false, reason: "not_configured" };
    if (quotaReached()) return { ok: false, reason: "quota" };

    try {
      const res = await fetch(AI_ROAST_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, history, character: character ? character.id : null, name: playerName }),
      });
      if (!res.ok) return { ok: false, reason: "error" };
      const data = await res.json();
      if (!data || typeof data.reply !== "string") return { ok: false, reason: "error" };

      history.push({ role: "user", content: message });
      history.push({ role: "assistant", content: data.reply });
      history = history.slice(-HISTORY_LIMIT);
      bumpTurnsUsed();

      return { ok: true, reply: data.reply, turnsLeft: getMaxTurns() - getTurnsUsed() };
    } catch (e) {
      return { ok: false, reason: "error" };
    }
  }

  return {
    isConfigured,
    send,
    reset,
    open,
    getCharacter,
    getOpenerText,
    quotaReached,
    maxTurnsPerDay: MAX_TURNS_PER_DAY,
    getMaxTurns,
    isTopupConfigured,
    openTopupCheckout,
  };
})();
