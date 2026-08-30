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

   ・2026-08-30、上記の限界に対応するため「楽観的解放＋事後検証」を
     追加した：session_idの形が正しければ従来通りその場で即解放
     （体感速度は変えない）しつつ、裏でapi/verify-payment.jsへ
     一度だけ問い合わせ、Stripe側で本当に支払い済みと確認できな
     かった場合だけ解放を自動的に取り消す（PAYMENT_VERIFY_ENDPOINTが
     billing-config.jsで設定済みのときのみ動作。Webhookも
     データベースも使わない、状態を持たない同期チェック）
   ・検証エンドポイントが応答しない/未設定のときは「安全側」に
     倒して解放を維持する（正規購入者を誤って締め出さないため）。
     その代わり、その間は不正対策としては効かない

   ---------------------------------------------------------
   このファイルは createBillingModule() を使って、
   通常のプレミアム（Billing）と、法人・パーティープラン
   （PartyBilling）の2つを、同じ仕組みで作っています。
   ========================================================= */

function createBillingModule(config) {
  const { storageKey, returnParam, sessionParam, devParam, getPaymentLink, allowReferralBonus, plan } = config;

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
  function getReturnSessionId() {
    if (params.get(returnParam) !== "1") return null;
    const sessionId = params.get(sessionParam) || "";
    return SESSION_ID_PATTERN.test(sessionId) ? sessionId : null;
  }

  // 決済から戻った直後に1回だけ、api/verify-payment.jsへ本当に支払い済みか
  // 問い合わせる。Stripe側で確認が取れなかった場合だけ解放を取り消す
  // （エンドポイント未設定・ネットワーク不通時は安全側に倒し、何もしない）
  function verifyInBackground(sessionId) {
    if (typeof PAYMENT_VERIFY_ENDPOINT !== "string" || !PAYMENT_VERIFY_ENDPOINT || !plan) return;
    const url = `${PAYMENT_VERIFY_ENDPOINT}?session_id=${encodeURIComponent(sessionId)}&plan=${encodeURIComponent(plan)}`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.valid === false) writeFlag(false); // 明確に「不正」と判定できたときだけ取り消す
      })
      .catch(() => {});
  }

  let justUnlocked = false; // このページ読み込みで新規に解放されたか（お祝い演出の判定用）

  // Stripeの決済リンクから戻ってきたときに解放を記録し、URLからパラメータを消す
  function handleReturnFromCheckout() {
    const sessionId = getReturnSessionId();
    if (!sessionId) return;
    const alreadyUnlocked = readFlag();
    writeFlag(true);
    justUnlocked = !alreadyUnlocked;
    const url = new URL(location.href);
    url.searchParams.delete(returnParam);
    url.searchParams.delete(sessionParam);
    history.replaceState({}, "", url.toString());
    verifyInBackground(sessionId);
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
  plan: "premium",
});

// 法人・パーティープラン（結婚式二次会・会社の飲み会向け特別パック）
const PartyBilling = createBillingModule({
  storageKey: "batsu-party-premium",
  returnParam: "party_paid",
  sessionParam: "party_session_id",
  devParam: "partypremium",
  getPaymentLink: () => STRIPE_PARTY_PAYMENT_LINK,
  allowReferralBonus: false,
  plan: "party",
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
  plan: "solo",
});
