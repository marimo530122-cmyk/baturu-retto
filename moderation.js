/* =========================================================
   🛡️ 罰ゲーム投稿の自動審査（モデレーション）
   ---------------------------------------------------------
   ユーザーが投稿した罰ゲームを、他のユーザーに共有される前に
   自動でスクリーニングする最初の網。

   ・NGワードチェック（即時判定・このファイル内だけで完結する）
   ・LLM審査（プロンプトの組み立てまでを土台として用意。実際の
     API呼び出しは未接続 ── 秘密鍵をこの静的サイトのJSに直接
     書くと盗まれてしまうため、安全に呼び出すには別途「鍵を
     隠して中継してくれるサーバー」が必要になる）

   審査ステータス：
     pending  … 審査中（NGワードは通過したが、まだ公開されていない）
     approved … 承認済み（他のユーザーに共有される）
     rejected … 却下（NGワードに一致、または管理者が却下した）

   ⚠️ 正直な注意：NGワード方式は「最初の網」でしかなく、
   言い換えや別表現ですり抜けられる可能性があります。
   これ単体を最終防衛ラインにはせず、必ず
   ①この審査 → ②pending状態での公開待ち → ③通報ボタン
   の3段構えで運用してください。
   ========================================================= */

const ModerationStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

const Moderation = (() => {
  const MAX_LENGTH = 200;

  // 即時却下の対象：個人特定・誹謗中傷/嫌がらせ・暴力/深刻な精神的攻撃・違法行為・純粋な悪意
  // ※網羅的なリストではない（最初の網。すり抜けは③通報ボタンでカバーする想定）
  const NG_WORDS = [
    // 個人の特定につながる情報
    "住所", "電話番号", "本名", "本籍", "LINE ID", "line id",
    // 誹謗中傷・嫌がらせ・人格攻撃
    "死ね", "殺す", "消えろ", "きもい", "ブス", "デブ", "障害者", "馬鹿にする",
    // ハラスメント・性暴力関連
    "レイプ", "強姦", "セクハラ", "パワハラ", "盗撮", "盗聴",
    // 違法薬物
    "覚醒剤", "大麻", "麻薬",
  ];

  function findNgWord(text) {
    const lower = text.toLowerCase();
    return NG_WORDS.find((w) => lower.includes(w.toLowerCase())) || null;
  }

  /**
   * 投稿テキストを自動審査する
   * @param {string} text
   * @returns {{status: string, reason: string}}
   */
  function review(text) {
    const trimmed = (text || "").trim();
    if (!trimmed) return { status: ModerationStatus.REJECTED, reason: "empty" };
    if (trimmed.length > MAX_LENGTH) return { status: ModerationStatus.REJECTED, reason: "too_long" };

    const hit = findNgWord(trimmed);
    if (hit) return { status: ModerationStatus.REJECTED, reason: "ng_word" };

    // NGワードを通過したものは「審査中」。LLM審査 or 管理者の目視確認を待つ
    return { status: ModerationStatus.PENDING, reason: "awaiting_review" };
  }

  /**
   * LLMモデレーション用のプロンプトを組み立てる（呼び出し先は未接続）
   * このゲームの世界観：「誰も傷つけない・でも大人として楽しめるグレーゾーンは歓迎」
   */
  function buildLlmPrompt(text) {
    return [
      "あなたは、飲み会で遊ぶ罰ゲームアプリ「バツルーレット」の投稿審査担当です。",
      "次の投稿が、公開してよい内容かを判定してください。",
      "",
      "【許可する】参加者全員が「バカだなぁ」「ちょっとエッチだけど面白い！」と",
      "笑って楽しめる、大人向けのセクシー・お色気のあるグレーゾーンの内容。",
      "",
      "【却下する】個人が特定される情報、誹謗中傷や嫌がらせ、暴力的な内容、",
      "深刻に人を傷つける内容、違法行為を促す内容、笑えない純粋な悪意しかない内容。",
      "",
      "投稿内容:",
      `「${text}」`,
      "",
      '回答は次のJSON形式のみで返してください: {"allowed": true または false, "reason": "一言の理由"}',
    ].join("\n");
  }

  /**
   * 実際のLLM API呼び出し（未接続のスタブ）。
   * 将来、秘密鍵を安全に扱える中継サーバー（例：Cloud Functions）を用意したら、
   * この中身をそのAPIへのfetch呼び出しに置き換える。
   * @returns {Promise<{allowed: boolean, reason: string} | null>} 未接続の間は常にnull
   */
  async function requestLlmReview(text) {
    console.warn(
      "[Moderation] LLM審査は未接続です。buildLlmPrompt() で組み立てたプロンプトを、" +
        "安全な中継サーバー経由でLLM APIに送る実装に置き換えてください。" +
        "未接続の間は、NGワード審査＋pending状態での手動承認にフォールバックします。"
    );
    return null;
  }

  return { review, findNgWord, buildLlmPrompt, requestLlmReview, MAX_LENGTH };
})();
