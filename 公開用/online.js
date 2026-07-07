/* =========================================================
   📡 オンライン飲み会モード
   ・幹事（ホスト）が部屋を作り、そこで出た結果を
     離れた場所にいる参加者（ゲスト）のスマホにも配信する。
   ・Zoom等のビデオ通話をしながら、全員が同じお題を見られる。
   ---------------------------------------------------------
   Firebase Realtime Database を使用（firebase-config.js を参照）。
   設定が済んでいない間は isConfigured() が false を返し、
   安全に「使えません」の案内を出せるようになっている。
   ========================================================= */

const Online = (() => {
  let db = null;
  let roomCode = null;
  let role = null; // "host" | "guest" | null
  let latestRef = null;
  let onResult = null;

  // Firebaseの設定が入力済みかどうか
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

  function generateCode() {
    return String(Math.floor(1000 + Math.random() * 9000)); // 4桁のコード
  }

  // 部屋を作る（幹事側）。戻り値: 部屋コード（失敗時はnull）
  function createRoom() {
    if (!ensureApp()) return null;
    roomCode = generateCode();
    role = "host";
    db.ref("rooms/" + roomCode).set({ createdAt: Date.now() });
    return roomCode;
  }

  // 部屋に参加する（参加者側）。resultCallback(data) が結果を受け取るたびに呼ばれる
  function joinRoom(code, resultCallback) {
    if (!ensureApp()) return false;
    roomCode = code;
    role = "guest";
    onResult = resultCallback;
    latestRef = db.ref("rooms/" + roomCode + "/latest");
    latestRef.on("value", (snap) => {
      const data = snap.val();
      if (data && onResult) onResult(data);
    });
    return true;
  }

  // 結果をみんなに配信する（幹事のみ）
  function broadcast(data) {
    if (role !== "host" || !db || !roomCode) return;
    db.ref("rooms/" + roomCode + "/latest").set(
      Object.assign({}, data, { ts: Date.now() })
    );
  }

  // 部屋から退出する
  function leave() {
    if (latestRef) latestRef.off();
    roomCode = null;
    role = null;
    onResult = null;
    latestRef = null;
  }

  return {
    isConfigured,
    createRoom,
    joinRoom,
    broadcast,
    leave,
    get roomCode() {
      return roomCode;
    },
    get role() {
      return role;
    },
  };
})();
