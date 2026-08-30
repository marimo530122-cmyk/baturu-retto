/* =========================================================
   💎 課金（Stripe決済リンク・サーバー不要版）
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

   ---------------------------------------------------------
   このファイルは createBillingModule() を使って、
   通常のプレミアム（Billing）と、法人・パーティープラン
   （PartyBilling）の2つを、同じ仕組みで作っています。
   ========================================================= */

function createBillingModule(config) {
  const { storageKey, returnParam, sessionParam, devParam, getPaymentLink, allowReferralBonus } = config;

  // Stripeのチェックアウトセッションidの形（cs_test_... / cs_live_...）
  const SESSION_ID_PATTERN = /^cs_(test|live)_[A-Za-z0-9]{16,}$/;

  const params = new URLSearchParams(location.search);

  // 開発確認用：本番のStripe決済リンクを設定するまでは
  // このURLパラメータを付けても有料機能を試せる
  const devOverride = params.get(devParam) === "1";

  function isConfigured() {
    const link = getPaymentLink();
    return (
      typeof link === "string" &&
      link.indexOf("https://buy.stripe.com/") === 0 &&
      link.indexOf("YOUR_PAYMENT_LINK") === -1
    );
  }

  function readFlag() {
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch (e) {
      return false;
    }
  }

  function writeFlag(value) {
    try {
      localStorage.setItem(storageKey, value ? "1" : "0");
    } catch (e) {}
  }

  // "?paid=1" が付いているだけでなく、Stripeのsession_idらしき
  // 文字列が一緒に付いているときだけ、本物の決済復帰とみなす
  function isValidCheckoutReturn() {
    if (params.get(returnParam) !== "1") return false;
    const sessionId = params.get(sessionParam) || "";
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
    url.searchParams.delete(returnParam);
    url.searchParams.delete(sessionParam);
    history.replaceState({}, "", url.toString());
  }
  handleReturnFromCheckout();

  function isPremium() {
    if (devOverride || readFlag()) return true;
    // 友達紹介の特典（24時間お試し）は、通常プレミアムにのみ適用する
    if (allowReferralBonus && typeof Referral !== "undefined" && Referral.hasActiveBonus()) {
      return true;
    }
    return false;
  }

  // このページ読み込みで「たった今」解放された場合だけ true（お祝い演出を1回だけ出すため）
  function wasJustUnlocked() {
    return justUnlocked;
  }

  // アップグレード導線。設定済みならStripeの決済リンクを開き、trueを返す
  function openCheckout() {
    if (!isConfigured()) return false;
    let link = getPaymentLink();
    // 紹介コード・アフィリエイトコードが分かれば、client_reference_idとして付与する
    if (typeof Referral !== "undefined" && Referral.enrichCheckoutUrl) {
      link = Referral.enrichCheckoutUrl(link);
    }
    window.open(link, "_blank", "noopener");
    return true;
  }

  return { isPremium, isConfigured, openCheckout, wasJustUnlocked };
}

// 通常のプレミアム（大人向けパック・1対1モード等）
const Billing = createBillingModule({
  storageKey: "batsu-premium",
  returnParam: "paid",
  sessionParam: "session_id",
  devParam: "premium",
  getPaymentLink: () => STRIPE_PAYMENT_LINK,
  allowReferralBonus: true,
});

// 法人・パーティープラン（結婚式二次会・会社の飲み会向け特別パック）
const PartyBilling = createBillingModule({
  storageKey: "batsu-party-premium",
  returnParam: "party_paid",
  sessionParam: "party_session_id",
  devParam: "partypremium",
  getPaymentLink: () => STRIPE_PARTY_PAYMENT_LINK,
  allowReferralBonus: false,
});

// 🍶 ひとり飲みモード＋飲み友AI 専用の月額サブスク（¥500/月「ワンコイン」）
// QRコードの24時間お試し（お友達紹介特典）は、通常プレミアム(Billing)と
// 同じくこちらにも適用する（2026-08-22: 当初は月額プランだけに絞る案も
// あったが、既存の12言語ぶんの「大人向けパックも解放」という文言と矛盾する
// ため、全プレミアムに一律適用する現状維持の方針に決定）
const SoloBilling = createBillingModule({
  storageKey: "batsu-solo-premium",
  returnParam: "solo_paid",
  sessionParam: "solo_session_id",
  devParam: "solopremium",
  getPaymentLink: () => STRIPE_SOLO_PAYMENT_LINK,
  allowReferralBonus: true,
});
