/* =========================================================
   🔗 お友達紹介 & アフィリエイト（共通の紹介コード基盤）
   ---------------------------------------------------------
   ・全員に自動で「自分専用の紹介コード」が割り振られる
   ・そのリンクを友達に送って遊んでもらうと、送った側・
     送られた側の両方に「プレミアム24時間お試し」特典が付く
   ・同じ仕組みが、そのままアフィリエイト（協力してくれる
     インフルエンサー等）にも使える：
       誰かがそのリンク経由でプレミアムを購入すると、
       Stripeの決済リンクに client_reference_id として
       紹介コードが自動で付くので、Stripeダッシュボードの
       決済一覧で「どのコード経由の購入か」が分かる。
       → そこから手動で紹介料を計算・還元する運用を想定。

   ⚠️ 正直な限界：
   ・「送った側」にも特典を自動で反映するには、Firebaseの
     設定（firebase-config.js）が必要。未設定の間は
     「送られた側（新しく遊びに来た人）」の特典だけが
     その場で有効になる（Firebase不要・常に動作）。
   ・Stripeの決済報酬(アフィリエイト報酬の実際の支払い)は
     自動化されておらず、オーナーが手動で確認・送金する
     運用を想定した「トラッキングの仕組み」です。
   ========================================================= */

const Referral = (() => {
  const CODE_KEY = "batsu-my-code";
  const REF_KEY = "batsu-referrer-code";
  const BONUS_UNTIL_KEY = "batsu-referral-bonus-until";
  const CHECKED_COUNT_KEY = "batsu-referral-checked-count";
  const BONUS_HOURS = 24;
  const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 紛らわしい文字(0/O, 1/I)は除外

  function randomCode() {
    let s = "";
    for (let i = 0; i < 6; i++) {
      s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    return s;
  }

  function getMyCode() {
    try {
      let code = localStorage.getItem(CODE_KEY);
      if (!code) {
        code = randomCode();
        localStorage.setItem(CODE_KEY, code);
      }
      return code;
    } catch (e) {
      return "GUEST1";
    }
  }

  function getReferrerCode() {
    try {
      return localStorage.getItem(REF_KEY) || null;
    } catch (e) {
      return null;
    }
  }

  function grantBonus() {
    try {
      const until = Date.now() + BONUS_HOURS * 3600 * 1000;
      localStorage.setItem(BONUS_UNTIL_KEY, String(until));
    } catch (e) {}
  }

  function hasActiveBonus() {
    try {
      const until = Number(localStorage.getItem(BONUS_UNTIL_KEY) || 0);
      return Date.now() < until;
    } catch (e) {
      return false;
    }
  }

  // 自分の紹介リンク（?ref=自分のコード）を組み立てる
  function getShareLink() {
    const url = new URL(location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("ref", getMyCode());
    return url.toString();
  }

  // Stripeの決済リンクに、紹介コードをclient_reference_idとして付与する
  function enrichCheckoutUrl(baseUrl) {
    const code = getReferrerCode() || getMyCode();
    try {
      const url = new URL(baseUrl);
      url.searchParams.set("client_reference_id", code);
      return url.toString();
    } catch (e) {
      return baseUrl;
    }
  }

  // ---- Firebase連携（設定済みのときだけ、招待した側にも特典を反映） ----
  let db = null;

  function isFirebaseConfigured() {
    return (
      typeof FIREBASE_CONFIG !== "undefined" &&
      FIREBASE_CONFIG.apiKey &&
      FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY"
    );
  }

  function ensureDb() {
    if (typeof firebase === "undefined" || !isFirebaseConfigured()) return false;
    try {
      if (!firebase.apps || firebase.apps.length === 0) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }
      db = firebase.database();
      return true;
    } catch (e) {
      console.warn("Referral: Firebaseの初期化に失敗しました:", e);
      return false;
    }
  }

  // 新規訪問者が誰かの紹介コード経由で来たことを記録する（招待された回数のカウント用）
  function recordInviteToFirebase(code) {
    if (!ensureDb()) return;
    try {
      db.ref("referrals/" + code).push({ ts: Date.now() });
    } catch (e) {}
  }

  // 自分の紹介コード宛の招待が新たに増えていないか確認し、増えていれば特典を付与する
  function checkMyInvitesForBonus() {
    if (!ensureDb()) return;
    try {
      const myCode = getMyCode();
      db.ref("referrals/" + myCode).once("value", (snap) => {
        const count = snap.numChildren();
        const lastChecked = Number(localStorage.getItem(CHECKED_COUNT_KEY) || 0);
        if (count > lastChecked) {
          grantBonus();
          localStorage.setItem(CHECKED_COUNT_KEY, String(count));
        }
      });
    } catch (e) {}
  }

  // 初回訪問時に ?ref=コード を検出して記録する（自分自身のコードは無視）
  function captureReferrer() {
    try {
      const params = new URLSearchParams(location.search);
      const ref = params.get("ref");
      if (!ref) return;
      if (ref === getMyCode()) return; // 自分のリンクを自分で踏んでも無視
      if (!localStorage.getItem(REF_KEY)) {
        localStorage.setItem(REF_KEY, ref);
        grantBonus(); // 招待された側（新規）にその場で特典を付与
        recordInviteToFirebase(ref); // 招待した側の特典判定用に記録（Firebase設定時のみ）
      }
      const url = new URL(location.href);
      url.searchParams.delete("ref");
      history.replaceState({}, "", url.toString());
    } catch (e) {}
  }

  captureReferrer();
  checkMyInvitesForBonus();

  return {
    getMyCode,
    getReferrerCode,
    getShareLink,
    hasActiveBonus,
    grantBonus,
    enrichCheckoutUrl,
    isFirebaseConfigured,
  };
})();
