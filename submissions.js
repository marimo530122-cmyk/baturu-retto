/* =========================================================
   📮 罰ゲーム投稿・共有（プレミアム機能）
   ---------------------------------------------------------
   プレミアムユーザーが自作の罰ゲームを投稿し、moderation.jsの
   自動審査を通過 → 承認（approved）されたものだけが、
   他のユーザーと共有される。

   Firebase Realtime Database を使用（firebase-config.js を参照）。
   online.js と同じ仕組みなので、firebase-config.js の設定が
   済んでいない間は isConfigured() が false を返し、
   安全に「使えません」の案内を出せるようになっている。
   ========================================================= */

const Submissions = (() => {
  let db = null;
  const REPORT_THRESHOLD = 3; // これだけ通報が集まったら自動で再審査待ちに戻す

  function isConfigured() {
    return (
      typeof FIREBASE_CONFIG !== "undefined" &&
      FIREBASE_CONFIG.apiKey &&
      FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY"
    );
  }

  function ensureApp() {
    if (typeof firebase === "undefined" || !isConfigured()) return false;
    try {
      if (!firebase.apps || firebase.apps.length === 0) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }
      db = firebase.database();
      return true;
    } catch (e) {
      console.warn("Firebaseの初期化に失敗しました:", e);
      return false;
    }
  }

  /**
   * 罰ゲームを投稿する（自動審査つき）
   * @returns {{ok: boolean, status?: string, reason?: string, id?: string}}
   */
  function submit(text, lang) {
    if (!ensureApp()) return { ok: false, reason: "not_configured" };
    const result = Moderation.review(text);
    if (result.status === ModerationStatus.REJECTED) {
      return { ok: false, reason: result.reason };
    }
    const ref = db.ref("submissions").push();
    ref.set({
      text: text.trim(),
      lang: lang || "ja",
      status: result.status, // 基本は "pending"（審査中）
      createdAt: Date.now(),
      reportCount: 0,
    });
    return { ok: true, id: ref.key, status: result.status };
  }

  // 承認済みの投稿一覧をリアルタイムで受け取る
  function watchApproved(callback) {
    if (!ensureApp()) return false;
    db.ref("submissions")
      .orderByChild("status")
      .equalTo(ModerationStatus.APPROVED)
      .on("value", (snap) => {
        const items = [];
        snap.forEach((child) => {
          items.push(Object.assign({ id: child.key }, child.val()));
        });
        items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        callback(items);
      });
    return true;
  }

  // 審査待ち（pending）の投稿一覧をリアルタイムで受け取る（管理者用）
  function watchPending(callback) {
    if (!ensureApp()) return false;
    db.ref("submissions")
      .orderByChild("status")
      .equalTo(ModerationStatus.PENDING)
      .on("value", (snap) => {
        const items = [];
        snap.forEach((child) => {
          items.push(Object.assign({ id: child.key }, child.val()));
        });
        items.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        callback(items);
      });
    return true;
  }

  // 通報する。一定数集まったら自動で再審査待ち（pending）に戻す
  function report(id) {
    if (!ensureApp()) return;
    db.ref("submissions/" + id).transaction((current) => {
      if (!current) return current;
      current.reportCount = (current.reportCount || 0) + 1;
      if (current.reportCount >= REPORT_THRESHOLD) {
        current.status = ModerationStatus.PENDING;
      }
      return current;
    });
  }

  // 管理者用：承認 / 却下する
  // ⚠️ 運用時はFirebaseのセキュリティルールで、このパスへの書き込みを
  // 管理者アカウントだけに絞ることを推奨（今は開発中のテストモード想定）
  function moderate(id, approve) {
    if (!ensureApp()) return;
    db.ref("submissions/" + id + "/status").set(
      approve ? ModerationStatus.APPROVED : ModerationStatus.REJECTED
    );
  }

  return { isConfigured, submit, watchApproved, watchPending, report, moderate };
})();
