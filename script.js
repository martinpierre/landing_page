/* Holyse Système — landing page */

/* ---- À personnaliser ---- */
const CONTACT_EMAIL = "votre-email@exemple.fr"; // adresse qui reçoit les messages du formulaire

/* ---- Année du pied de page ---- */
document.getElementById("year").textContent = new Date().getFullYear();

/* ---- Menu mobile ---- */
(function () {
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.getElementById("menu");
  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    menu.classList.toggle("open", open);
  };
  toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
})();

/* ---- Onglets « Réalisations » ---- */
(function () {
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  const select = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) tab.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(tab, false));
    tab.addEventListener("keydown", (e) => {
      let next = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next = tabs[(i + 1) % tabs.length];
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === "Home") next = tabs[0];
      if (e.key === "End") next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); select(next, true); }
    });
  });
})();

/* ---- Hero : courbes de niveau bathymétriques animées ---- */
(function () {
  const canvas = document.getElementById("sonar");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const hero = canvas.parentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const CELL = 16;
  const LEVELS = [-2.4, -1.8, -1.2, -0.6, 0, 0.6, 1.2, 1.8, 2.4];
  const HIGHLIGHT = 0.6; // une courbe mise en avant, en jaune
  let w = 0, h = 0, cols = 0, rows = 0, dpr = 1, grid = null;
  let running = false, visible = true, last = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = hero.clientWidth; h = hero.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(w / CELL) + 2; rows = Math.ceil(h / CELL) + 2;
    grid = new Float32Array(cols * rows);
    draw(performance.now());
  }

  function field(x, y, t) {
    return Math.sin(x * 0.011 + t * 0.00018) * 0.9 +
           Math.sin(y * 0.016 - t * 0.00014) * 0.9 +
           Math.sin((x + y) * 0.008 + t * 0.0001) * 0.9 +
           Math.sin(Math.hypot(x - w * 0.72, y - h * 0.45) * 0.018 - t * 0.0002) * 1.2;
  }

  // segments à relier selon le cas marching squares ; arêtes : 0 haut, 1 droite, 2 bas, 3 gauche
  const SEG = [[],[[3,2]],[[2,1]],[[3,1]],[[0,1]],[[0,3],[2,1]],[[0,2]],[[0,3]],[[0,3]],[[0,2]],[[0,1],[3,2]],[[0,1]],[[3,1]],[[2,1]],[[3,2]],[]];

  function edgePoint(e, x0, y0, a, b, c, d, L) {
    switch (e) {
      case 0: return [x0 + CELL * (L - a) / (b - a), y0];
      case 1: return [x0 + CELL, y0 + CELL * (L - b) / (c - b)];
      case 2: return [x0 + CELL * (L - d) / (c - d), y0 + CELL];
      default: return [x0, y0 + CELL * (L - a) / (d - a)];
    }
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) grid[j * cols + i] = field(i * CELL, j * CELL, t);
    ctx.lineWidth = 1.2;
    LEVELS.forEach((L) => {
      ctx.beginPath();
      for (let j = 0; j < rows - 1; j++) {
        for (let i = 0; i < cols - 1; i++) {
          const a = grid[j * cols + i], b = grid[j * cols + i + 1];
          const c = grid[(j + 1) * cols + i + 1], d = grid[(j + 1) * cols + i];
          const k = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0);
          const segs = SEG[k];
          for (let s = 0; s < segs.length; s++) {
            const p = edgePoint(segs[s][0], i * CELL, j * CELL, a, b, c, d, L);
            const q = edgePoint(segs[s][1], i * CELL, j * CELL, a, b, c, d, L);
            ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
          }
        }
      }
      ctx.strokeStyle = L === HIGHLIGHT ? "rgba(251,210,48,.7)" : "rgba(220,232,239,.16)";
      ctx.stroke();
    });
  }

  function loop(t) {
    if (!running) return;
    if (t - last > 33) { draw(t); last = t; }
    requestAnimationFrame(loop);
  }
  function start() { if (!running && visible && !document.hidden && !reduce) { running = true; requestAnimationFrame(loop); } }
  function stop() { running = false; }

  resize();
  window.addEventListener("resize", resize);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; visible ? start() : stop(); }).observe(hero);
  }
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  start();
})();

/* ---- Formulaire : ouvre la messagerie avec le message pré-rempli ---- */
(function () {
  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const fields = ["nom", "email", "message"];
    let ok = true;
    fields.forEach((name) => {
      const el = form.elements[name];
      const valid = el.value.trim() !== "" && (name !== "email" || /^\S+@\S+\.\S+$/.test(el.value.trim()));
      el.setAttribute("aria-invalid", String(!valid));
      if (!valid) ok = false;
    });
    status.classList.toggle("error", !ok);
    if (!ok) { status.textContent = "Vérifiez les champs signalés : nom, e-mail valide et message."; return; }
    const org = (data.get("organisation") || "").toString().trim();
    const body = "Bonjour,\n\n" + data.get("message").toString().trim() +
      "\n\n—\n" + data.get("nom").toString().trim() + (org ? " (" + org + ")" : "") +
      "\n" + data.get("email").toString().trim();
    const subject = "Projet robotique — " + data.get("nom").toString().trim();
    window.location.href = "mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    status.textContent = "Votre messagerie s’ouvre avec le message pré-rempli. Il ne reste qu’à l’envoyer.";
  });
})();
