/* =========================================================
   ✨ 群知能ふう背景エフェクト（スワーム）
   ---------------------------------------------------------
   ・光の粒が、意思を持った生き物の群れのように、ゆっくり
     自律的にただよいながら、カーソル/指の近くにふわっと
     集まってくる背景演出
   ・ボタンや文字などのUIパーツ自体は一切動かさない
     （酔っていても押せる、という設計方針を壊さないため）
   ・#swarm-canvas は z-index:-1 の最背面レイヤーなので、
     クリックやタップを一切邪魔しない
   ・軽さ最優先：粒の数を少なめに固定し、タブが非表示のときや
     「アニメーションを減らす」設定のときは自動で止める
   ========================================================= */

const Swarm = (() => {
  const canvas = document.getElementById("swarm-canvas");
  if (!canvas) return {};
  const ctx = canvas.getContext("2d");

  const reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const COUNT = 34; // 軽さ優先で少なめに固定
  const ATTRACT_RADIUS = 150;
  const SEPARATION = 16;
  const MAX_SPEED = 1.4;

  let particles = [];
  let pointer = { x: 0, y: 0, active: false };
  let running = false;
  let colorA = "#ff2d95";
  let colorB = "#8f4bff";

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function readThemeColors() {
    const style = getComputedStyle(document.body);
    colorA = style.getPropertyValue("--c-accent-a").trim() || colorA;
    colorB = style.getPropertyValue("--c-accent-b").trim() || colorB;
  }

  function makeParticle() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.6 + 1.2,
      warm: Math.random() > 0.5,
    };
  }

  function onPointerMove(x, y) {
    pointer.x = x;
    pointer.y = y;
    pointer.active = true;
  }
  window.addEventListener("mousemove", (e) => onPointerMove(e.clientX, e.clientY), { passive: true });
  window.addEventListener(
    "touchmove",
    (e) => {
      const t = e.touches[0];
      if (t) onPointerMove(t.clientX, t.clientY);
    },
    { passive: true }
  );
  window.addEventListener("mouseleave", () => { pointer.active = false; });
  window.addEventListener("touchend", () => { pointer.active = false; });
  window.addEventListener("resize", resize);

  function tick() {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // 自律的なゆらぎ（群れ全体がただ静止しないように）
      p.vx += (Math.random() - 0.5) * 0.02;
      p.vy += (Math.random() - 0.5) * 0.02;

      // カーソル/指の近くにゆるく引き寄せられる（群れの「意思」の演出）
      if (pointer.active) {
        const dx = pointer.x - p.x;
        const dy = pointer.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < ATTRACT_RADIUS && dist > 0.01) {
          p.vx += (dx / dist) * 0.03;
          p.vy += (dy / dist) * 0.03;
        }
      }

      // 近すぎる粒同士は軽く反発（団子にならないように）
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const dist = Math.hypot(dx, dy);
        if (dist < SEPARATION && dist > 0.01) {
          const push = ((SEPARATION - dist) / SEPARATION) * 0.05;
          p.vx += (dx / dist) * push;
          p.vy += (dy / dist) * push;
          q.vx -= (dx / dist) * push;
          q.vy -= (dy / dist) * push;
        }
      }

      const speed = Math.hypot(p.vx, p.vy);
      if (speed > MAX_SPEED) {
        p.vx = (p.vx / speed) * MAX_SPEED;
        p.vy = (p.vy / speed) * MAX_SPEED;
      }

      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -10) p.x = canvas.width + 10;
      if (p.x > canvas.width + 10) p.x = -10;
      if (p.y < -10) p.y = canvas.height + 10;
      if (p.y > canvas.height + 10) p.y = -10;

      ctx.beginPath();
      ctx.fillStyle = p.warm ? colorA : colorB;
      ctx.globalAlpha = 0.32;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    requestAnimationFrame(tick);
  }

  function start() {
    if (running || reduceMotion) return;
    running = true;
    requestAnimationFrame(tick);
  }
  function stop() {
    running = false;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  if (!reduceMotion) {
    resize();
    readThemeColors();
    particles = Array.from({ length: COUNT }, makeParticle);
    start();
  }

  return { readThemeColors };
})();
