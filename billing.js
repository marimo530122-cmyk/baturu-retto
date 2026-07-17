/* =========================================================
   💎 プレミアム課金（Stripe決済リンク・サーバー不要版）
   ---------------------------------------------------------
   ・アップグレードボタン → Stripeの決済リンクを新しいタブで開く
   ・決済完了後、Stripe側の「決済完了後のリダイレクト先」を
     このゲームのURL + "?paid=1" に設定しておくことで、
     戻ってきた瞬間にブラウザへ「プレミアム解放」を記録する
   ・記録はこの端末のlocalStorageに保存（アプリストア課金を
     導入するまでのつなぎとして、サーバーなしで最速で始める方式）

   ⚠️ 注意：サーバーでの決済確認をしていないため、詳しい人が
   ブラウザの開発者ツールでフラグを書き換えれば無料で解放できて
   しまう弱点があります。友人同士で遊ぶ飲み会アプリとして「まず
   最速で収益化を始める」ための割り切った実装です。将来的に
   アプリストア課金（Capacitor経由）へ切り替えると、この弱点は
   解消されます。
   ========================================================= */

const Billing = (() => {
  const STORAGE_KEY = "batsu-premium";
  const RETURN_PARAM = "paid";

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

  // Stripeの決済リンクから ?paid=1 付きで戻ってきたときに解放を記録する
  function handleReturnFromCheckout() {
    if (params.get(RETURN_PARAM) !== "1") return;
    writeFlag(true);
    const url = new URL(location.href);
    url.searchParams.delete(RETURN_PARAM);
    history.replaceState({}, "", url.toString());
  }
  handleReturnFromCheckout();

  function isPremium() {
    return devOverride || readFlag();
  }

  // アップグレード導線。設定済みならStripeの決済リンクを開き、trueを返す
  function openCheckout() {
    if (!isConfigured()) return false;
    window.open(STRIPE_PAYMENT_LINK, "_blank", "noopener");
    return true;
  }

  return { isPremium, isConfigured, openCheckout };
})();
