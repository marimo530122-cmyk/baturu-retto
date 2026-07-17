/* =========================================================
   💎 プレミアム課金（Stripe決済リンク・サーバー不要版）
   ---------------------------------------------------------
   ・アップグレードボタン → Stripeの決済リンクを新しいタブで開く
   ・決済完了後、Stripe側の「決済完了後のリダイレクト先」を
     このゲームのURL + "?paid=1&session_id={CHECKOUT_SESSION_ID}"
     に設定しておくことで、戻ってきた瞬間にブラウザへ
     「プレミアム解放」を記録する
   ・{CHECKOUT_SESSION_ID} はStripeが決済ごとに自動で発行する
     長いランダム文字列（例: cs_live_a1B2c3...）に置き換わる。
     手入力の "?paid=1" だけでは解放されないよう、この
     session_id の「形」が正しいことも合わせて確認している
   ・記録はこの端末のlocalStorageに保存（アプリストア課金を
     導入するまでのつなぎとして、サーバーなしで最速で始める方式）

   ⚠️ 注意（正直な限界）：サーバー側でStripeに「本当にこの
   session_idの決済が成立したか」を問い合わせているわけでは
   ないため、JavaScriptのコードを読んで session_id の形式を
   再現できる詳しい人であれば、理論上は無料で解放できてしまい
   ます。それでも「?paid=1と適当に打つだけ」の突破は防げるので、
   カジュアルな飲み会アプリとして「まず最速で収益化を始める」
   ための現実的な強化です。本当の意味で突破不可能にするには、
   サーバー側でStripeのWebhookを受けて検証する仕組み（や、将来の
   アプリストア課金）が必要になります。
   ========================================================= */

const Billing = (() => {
  const STORAGE_KEY = "batsu-premium";
  const RETURN_PARAM = "paid";
  const SESSION_PARAM = "session_id";
  // Stripeのチェックアウトセッションidの形（cs_test_... / cs_live_...）
  const SESSION_ID_PATTERN = /^cs_(test|live)_[A-Za-z0-9]{16,}$/;

  const params = new URLSearchParams(location.search);

  // 開発確認用：本番のStripe決済リンクを設定するまでは
  // ?premium=1 をURLに付けても有料機能を試せる
  const devOverride = params.get("premium") === "1";

  function isConfigured() {
    return (
      typeof STRIPE_PAYMENT_LINK === "string" &&
      STRIPE_PAYMENT_LINK.indexOf("https://buy.stripe.com/") === 0 &&
      STRIPE_PAYMENT_LINK.indexOf("YOUR_PAYMENT_LINK") === -1
    );
  }

  function readFlag() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function writeFlag(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch (e) {}
  }

  // "?paid=1" が付いているだけでなく、Stripeのsession_idらしき
  // 文字列が一緒に付いているときだけ、本物の決済復帰とみなす
  function isValidCheckoutReturn() {
    if (params.get(RETURN_PARAM) !== "1") return false;
    const sessionId = params.get(SESSION_PARAM) || "";
    return SESSION_ID_PATTERN.test(sessionId);
  }

  let justUnlocked = false; // このページ読み込みで新規に解放されたか（お祝い演出の判定用）

  // Stripeの決済リンクから戻ってきたときに解放を記録し、URLからパラメータを消す
  function handleReturnFromCheckout() {
    if (!isValidCheckoutReturn()) return;
    const alreadyUnlocked = readFlag();
    writeFlag(true);
    justUnlocked = !alreadyUnlocked;
    const url = new URL(location.href);
    url.searchParams.delete(RETURN_PARAM);
    url.searchParams.delete(SESSION_PARAM);
    history.replaceState({}, "", url.toString());
  }
  handleReturnFromCheckout();

  function isPremium() {
    return devOverride || readFlag();
  }

  // このページ読み込みで「たった今」解放された場合だけ true（お祝い演出を1回だけ出すため）
  function wasJustUnlocked() {
    return justUnlocked;
  }

  // アップグレード導線。設定済みならStripeの決済リンクを開き、trueを返す
  function openCheckout() {
    if (!isConfigured()) return false;
    window.open(STRIPE_PAYMENT_LINK, "_blank", "noopener");
    return true;
  }

  return { isPremium, isConfigured, openCheckout, wasJustUnlocked };
})();
