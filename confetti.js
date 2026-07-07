/* =========================================================
   紙吹雪エフェクト
   お題発表・王様誕生の瞬間に画面いっぱいに舞い散らせる。
   ========================================================= */

const Confetti = (() => {
  const canvas = document.getElementById("confetti-canvas");
  const ctx = canvas.getContext("2d");
  let particles = [];
  let animating = false;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  /**
   * 紙吹雪を舞わせる
   * @param {string[]} colors - 使う色の一覧
   * @param {number} count - 紙吹雪の枚数
   */
  function burst(colors, count = 90) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 80,
        y: canvas.height * 0.32,
        vx: (Math.random() - 0.5) * 9,
        vy: -Math.random() * 10 - 5,
        size: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        spin: (Math.random() - 0.5) * 22,
        life: 0,
      });
    }
    if (!animating) {
      animating = true;
      requestAnimationFrame(tick);
    }
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.vy += 0.28; // 重力
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.spin;
      p.life++;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });

    particles = particles.filter((p) => p.life < 130 && p.y < canvas.height + 40);

    if (particles.length > 0) {
      requestAnimationFrame(tick);
    } else {
      animating = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  return { burst };
})();
