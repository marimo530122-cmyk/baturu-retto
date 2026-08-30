/* =========================================================
   💎 決済セッションの検証 - Vercelサーバーレス関数
   ---------------------------------------------------------
   ・billing.js / ai-roast.js から、Stripeの決済リンクを開いて
     戻ってきた直後に1回だけ呼ばれる。session_idをこの関数が
     Stripe側へ直接問い合わせ、「本当にその金額で支払い済みか」
     を同期的に返すだけの、状態を持たない検証専用エンドポイント
   ・Webhookもデータベースも使わない：Stripeからの通知を待つ
     のではなく、こちらから今すぐ聞きに行く方式のため、
     保存・受信の仕組みが一切不要（api/roast.jsと同じVercel
     プロジェクトに関数を1つ追加するだけで完結する）
   ・STRIPE_SECRET_KEYは、このファイルには書かず、Vercelの
     プロジェクト設定 → Environment Variables に登録すること
     （Stripeダッシュボードの「開発者」→「APIキー」→
     「シークレットキー」。sk_live_... または sk_test_...）
   ・設定方法は 要件定義書.md の「決済検証エンドポイントの設定方法」を参照
   ========================================================= */

// プランごとの最低支払い金額（円）。この金額未満のセッションは、
// 別プラン用の安いセッションIDを使い回した疑いありとして拒否する。
// ⚠️ 金額を変更したときは、このテーブルも忘れずに更新すること
const MIN_AMOUNT_JPY = {
  premium: 480,
  party: 480, // 法人・パーティープランの正式価格が決まるまでの暫定値（通常プレミアムと同額を下限とする）
  solo: 500,
  roast_topup: 100,
};

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ valid: false, reason: "GET only" });
    return;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    res.status(500).json({ valid: false, reason: "STRIPE_SECRET_KEY is not configured on the server" });
    return;
  }

  const sessionId = typeof req.query.session_id === "string" ? req.query.session_id : "";
  const plan = typeof req.query.plan === "string" ? req.query.plan : "";
  const minAmount = MIN_AMOUNT_JPY[plan];

  if (!/^cs_(test|live)_[A-Za-z0-9]{16,}$/.test(sessionId) || !minAmount) {
    res.status(400).json({ valid: false, reason: "invalid session_id or plan" });
    return;
  }

  try {
    const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { authorization: `Bearer ${secretKey}` },
    });

    if (!stripeRes.ok) {
      // 存在しない/偽造されたsession_idは、Stripe側が404を返す
      res.status(200).json({ valid: false, reason: "session not found" });
      return;
    }

    const session = await stripeRes.json();
    const isPaid = session.status === "complete" && session.payment_status === "paid";
    const isRightAmount = session.currency === "jpy" && typeof session.amount_total === "number" && session.amount_total >= minAmount;

    res.status(200).json({ valid: isPaid && isRightAmount });
  } catch (e) {
    res.status(502).json({ valid: false, reason: "stripe request failed" });
  }
};
