/* =========================================================
   📸 ハイライト自動記録
   お題が発表される瞬間を、画像カードとして自動保存する。
   （html2canvasなどの外部ライブラリは使わず、Canvasで直接描く）
   ========================================================= */

const Highlights = (() => {
  const captures = []; // { dataUrl, text }
  const W = 1000;
  const H = 1000;

  // 日本語のように単語間にスペースがない言語でも折り返せるよう、
  // 1文字ずつ幅を測って折り返す
  function wrapText(ctx, text, maxWidth) {
    const lines = [];
    text.split("\n").forEach((paragraph) => {
      let line = "";
      for (const ch of paragraph) {
        const test = line + ch;
        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line);
          line = ch;
        } else {
          line = test;
        }
      }
      lines.push(line);
    });
    return lines;
  }

  /**
   * お題発表の瞬間をカード画像として保存する
   * @param {string} text - odai.displayText（画面表示用テキスト）
   * @param {string} accentColor - そのときのテーマ色
   * @param {string} title - ロゴ文字（例: "バツルーレット"）
   * @returns {string} 生成した画像のdataURL
   */
  function capture(text, accentColor, title) {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // 背景（ネオン夜の街風のグラデーション）
    const grad = ctx.createRadialGradient(W / 2, H * 0.18, 40, W / 2, H / 2, W * 0.85);
    grad.addColorStop(0, "#2a1550");
    grad.addColorStop(1, "#0b0716");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 外枠（テーマ色）
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 12;
    ctx.strokeRect(28, 28, W - 56, H - 56);

    // ロゴ
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "bold 48px sans-serif";
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 20;
    ctx.fillText(title, W / 2, 130);
    ctx.shadowBlur = 0;

    // お題本文
    ctx.font = "bold 42px sans-serif";
    const lines = wrapText(ctx, text, W - 180);
    const lineHeight = 62;
    let y = H / 2 - (lines.length * lineHeight) / 2;
    lines.forEach((line) => {
      ctx.fillText(line, W / 2, y);
      y += lineHeight;
    });

    // フッター
    ctx.font = "26px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText("#バツルーレット", W / 2, H - 60);

    const dataUrl = canvas.toDataURL("image/png");
    captures.unshift({ dataUrl, text });
    return dataUrl;
  }

  function all() {
    return captures;
  }

  function clear() {
    captures.length = 0;
  }

  return { capture, all, clear };
})();
