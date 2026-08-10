/* =========================================================
   😈 タゴサクAI（有料機能・要Vercelデプロイ）
   ---------------------------------------------------------
   ・ai-roast-config.js に書かれたVercelのAPIアドレスへユーザーの
     発言を送り、AIの毒舌コメントを受け取る
   ・エンドポイントが未設定（プレースホルダーのまま）のときは
     何も通信せず、呼び出し元に「未設定」を返すだけ
   ・AI(Google Gemini)は無料枠を利用しているが、無料枠にも
     利用回数の上限があるため、1日あたりの発言数に上限を設けて
     使いすぎを防ぐ（端末のlocalStorageで管理する簡易的なもの）
   ========================================================= */

const AiRoast = (() => {
  const MAX_TURNS_PER_DAY = 12;
  const HISTORY_LIMIT = 12; // 直近12件（ユーザー+AI合計）だけ会話履歴として送る

  let history = [];

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
    try {
      localStorage.setItem(todayKey(), String(getTurnsUsed() + 1));
    } catch (e) {}
  }

  function quotaReached() {
    return getTurnsUsed() >= MAX_TURNS_PER_DAY;
  }

  function reset() {
    history = [];
  }

  // 戻り値: { ok: true, reply } / { ok: false, reason: "not_configured" | "quota" | "error" }
  async function send(message) {
    if (!isConfigured()) return { ok: false, reason: "not_configured" };
    if (quotaReached()) return { ok: false, reason: "quota" };

    try {
      const res = await fetch(AI_ROAST_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      if (!res.ok) return { ok: false, reason: "error" };
      const data = await res.json();
      if (!data || typeof data.reply !== "string") return { ok: false, reason: "error" };

      history.push({ role: "user", content: message });
      history.push({ role: "assistant", content: data.reply });
      history = history.slice(-HISTORY_LIMIT);
      bumpTurnsUsed();

      return { ok: true, reply: data.reply, turnsLeft: MAX_TURNS_PER_DAY - getTurnsUsed() };
    } catch (e) {
      return { ok: false, reason: "error" };
    }
  }

  return { isConfigured, send, reset, quotaReached, maxTurnsPerDay: MAX_TURNS_PER_DAY };
})();
