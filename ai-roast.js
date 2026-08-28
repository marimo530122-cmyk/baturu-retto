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
  const MAX_TURNS_PER_DAY = 12;
  const HISTORY_LIMIT = 12; // 直近12件（ユーザー+AI合計）だけ会話履歴として送る

  let history = [];
  let character = null;
  let playerName = "";

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

      return { ok: true, reply: data.reply, turnsLeft: MAX_TURNS_PER_DAY - getTurnsUsed() };
    } catch (e) {
      return { ok: false, reason: "error" };
    }
  }

  return { isConfigured, send, reset, open, getCharacter, getOpenerText, quotaReached, maxTurnsPerDay: MAX_TURNS_PER_DAY };
})();
