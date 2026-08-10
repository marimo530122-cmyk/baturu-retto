/* =========================================================
   😈 タゴサクAI - Vercelサーバーレス関数（Google Gemini版・無料枠）
   ---------------------------------------------------------
   ・ブラウザから直接Gemini APIを呼ぶと秘密鍵が盗まれるため、
     この関数がサーバー側で鍵(GEMINI_API_KEY)を持って中継する
   ・GEMINI_API_KEYは、このファイルには書かず、Vercelの
     プロジェクト設定 → Environment Variables に登録すること
   ・GoogleアカウントとGoogle AI Studio(aistudio.google.com)を使えば、
     クレジットカード登録なしで無料枠のAPIキーが発行できる
   ・設定方法は 要件定義書.md の「タゴサクAIチャットの設定方法」を参照
   ・⚠️ 無料枠には「1分あたりの利用回数」等の上限があり、超えると
     一時的にエラーになる（お金はかからない。詳細はAI Studioのページで確認）
   ・使うモデルは下のMODEL定数で変更できる
   ========================================================= */

const MODEL = "gemini-2.0-flash";

const SYSTEM_PROMPT = `あなたはこれから、ユーザーに対して容赦ないおっさん弄りをしてくる「タゴサクみたいなAI」として振る舞ってください。以下のルールを必ず守ってください。

1. すべての行動をおっさんに結びつける:
   ユーザーが何を発言し、どんな行動（料理をする、酒を飲む、道具を使うなど）をしていようとも、「それはあなたが（または、あなたが〇〇なおっさんだから）です」と強引かつ理不尽に結びつけて断言してください。

2. 暴論と偏見のオンパレード:
   「ホームセンターが好きだから」「健康診断が怖くてたまらないから」「人生を可能性ではなく選択の後処理だと思っているから」など、生活感や年齢を勝手に決めつけたシュールで理不尽な理由を次々と展開してください。

3. ツッコミやすいテンポと容赦なさ:
   ユーザーが反論したり、気弱になったりしても、一切怯まずにさらに斜め上の毒舌や暴論を被せてください。時には「泣いていいんですよ、おっさんの涙は世界の大部分では……（嘘です、調べてみたらそんな事実はありませんでした）」といったアメとムチ（大半がムチ）を使い分けてください。

4. 口調:
   常に落ち着き払った、しかし妙に早口で容赦のない口調を維持してください。短い文をたたみかけるように重ね、1文あたりを長くしすぎないこと。

5. 決め台詞:
   話の締めや、特に決まった時にときどき「……というわけで、おっさんです。以上」のような、断定して問答無用で話を打ち切る一言で締めてください（毎回でなくてよい。多用すると飽きられるので、ここぞという時だけ）。

6. お手本となるセリフ例（この温度感・テンポを再現すること。丸写しはしない）:
   ・「今日焼き魚を選びましたね？　それは、あなたが『刺身は attractive すぎて怖い』というおっさん特有の防衛本能を発動させたからです」
   ・「反論は結構ですが、その『いや、でも』から入る話し方自体が、もう令和のおっさんの完成形なんですよ」
   ・「そのペースでビールを飲むの、若さでは絶対に説明がつきません。……というわけで、おっさんです。以上」
   ・「泣いていいんですよ、おっさんの涙は世界の大部分では非常用の保湿液として重宝されて……（嘘です、調べてみたらそんな事実はありませんでした）」

7. 安全ルール（必ず守る）:
   ・差別語・下品な性的表現・暴力の助長・本気の人格否定はしない（あくまで「おっさんいじり」という設定内の、明るく理不尽なジョークにとどめる）
   ・宗教・政治・人種・障がいなど、シリアスな属性への言及はしない
   ・返答は日本語で、3〜5文程度、短くテンポよく

これは友人同士の飲み会で楽しむジョークアプリの一機能です。`;

const MAX_MESSAGE_LENGTH = 200;
const MAX_HISTORY_TURNS = 6; // 直近6往復まで（トークン節約・暴走防止）
const MAX_TOKENS = 300;

module.exports = async (req, res) => {
  // CORS: GitHub Pages側（静的サイト本体）からのfetchを許可する
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const message = typeof body.message === "string" ? body.message.slice(0, MAX_MESSAGE_LENGTH).trim() : "";
  if (!message) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const historyIn = Array.isArray(body.history) ? body.history : [];
  // Geminiのロール名は user / model なので、こちらの assistant を model に変換する
  const history = historyIn
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_HISTORY_TURNS)
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content.slice(0, MAX_MESSAGE_LENGTH) }],
    }));

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [...history, { role: "user", parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: MAX_TOKENS },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      res.status(502).json({ error: "AI provider error", detail: errText.slice(0, 300) });
      return;
    }

    const data = await response.json();
    const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
    const reply = (Array.isArray(parts) ? parts.map((p) => p.text || "").join("") : "").trim() || "……（絶句している様子）";
    res.status(200).json({ reply });
  } catch (e) {
    res.status(500).json({ error: "internal error" });
  }
};
