// ==============================
// EFFECTS: cursor, particles, CRT boot, konami, toasts
// ==============================

// ---- Custom cursor + trail ----
export function installCursor() {
  if (matchMedia("(pointer: coarse)").matches) return;

  const dot = document.createElement("div");
  dot.className = "cursor-dot";
  const ring = document.createElement("div");
  ring.className = "cursor-ring";
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  let mx = 0, my = 0, rx = 0, ry = 0;
  let lastTrail = 0;
  let rafLoop = null;
  let active = false;

  function onMove(e) {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
    if (!active) { active = true; if (!rafLoop) rafLoop = requestAnimationFrame(loop); }

    const mode = document.body.dataset.cursor;
    if (mode === "trail") {
      const now = performance.now();
      if (now - lastTrail > 40) {
        lastTrail = now;
        const t = document.createElement("div");
        t.className = "cursor-trail-dot";
        t.style.cssText = `left:${mx}px;top:${my}px`;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 600);
      }
    }
  }
  document.addEventListener("mousemove", onMove, { passive: true });

  function loop() {
    const dx = mx - rx, dy = my - ry;
    rx += dx * 0.18; ry += dy * 0.18;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
    if (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3) { active = false; rafLoop = null; return; }
    rafLoop = requestAnimationFrame(loop);
  }

  const HOVER_SEL = "button, a, input, textarea, [role='button'], .cat-btn, .post-handle, .react-btn, .comment-react, .tweak-opt, .tweak-swatch, .emoji-pick";
  document.addEventListener("mouseover", (e) => {
    if (e.target.closest && e.target.closest(HOVER_SEL)) ring.classList.add("hover");
  }, { passive: true });
  document.addEventListener("mouseout", () => ring.classList.remove("hover"), { passive: true });
}

// ---- Particles ----
export function installParticles() {
  const canvas = document.createElement("canvas");
  canvas.id = "particles-canvas";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d", { alpha: true });
  let parts = [];
  let running = false;
  let rafId = null;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function spawn() {
    const w = window.innerWidth, h = window.innerHeight;
    const n = Math.min(60, Math.floor((w * h) / 40000));
    parts = [];
    for (let i = 0; i < n; i++) {
      parts.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        r: Math.random() * 1.2 + 0.3,
        a: Math.random() * 0.5 + 0.15,
      });
    }
  }
  resize(); spawn();
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); spawn(); }, 150);
  });

  function tick() {
    if (!running) { rafId = null; return; }
    const w = window.innerWidth, h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = w; else if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h; else if (p.y > h) p.y = 0;
      ctx.beginPath();
      ctx.fillStyle = `rgba(157, 255, 0, ${p.a})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    rafId = requestAnimationFrame(tick);
  }
  function setRunning(on) {
    if (on && !running) { running = true; if (!rafId) rafId = requestAnimationFrame(tick); }
    else if (!on && running) { running = false; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }
  const mo = new MutationObserver(() => setRunning(document.body.dataset.bg === "particles"));
  mo.observe(document.body, { attributes: true, attributeFilter: ["data-bg"] });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) setRunning(false);
    else setRunning(document.body.dataset.bg === "particles");
  });
  setRunning(document.body.dataset.bg === "particles");
}

// ---- CRT boot ----
const BOOT_LINES = [
  { t: "F3XYKEE_OS v2.4.1 — booting...", c: "ok" },
  { t: "BIOS SEED: 0xC0FFEE · mem test .... 16384 MB OK", c: "dim" },
  { t: "loading kernel module [acid.sys] ..................... [OK]", c: "ok" },
  { t: "loading kernel module [scanlines.sys] ................ [OK]", c: "ok" },
  { t: "mounting /feed ........................................ [OK]", c: "ok" },
  { t: "mounting /comments .................................... [OK]", c: "ok" },
  { t: "checking steam_ban_counter ............................ [RUNNING]", c: "warn" },
  { t: "checking twitch_live_status ........................... [OFFLINE]", c: "dim" },
  { t: "init user session ..................................... [READY]", c: "ok" },
  { t: "", c: "" },
  { t: "welcome back. press any key to continue_", c: "ok" },
];

export function playBoot(onDone) {
  const root = document.createElement("div");
  root.className = "crt-boot";
  const wrap = document.createElement("div");
  wrap.className = "crt-lines";
  root.appendChild(wrap);
  document.body.appendChild(root);

  let i = 0;
  function nextLine() {
    if (i >= BOOT_LINES.length) {
      const cur = document.createElement("span");
      cur.className = "crt-cursor";
      wrap.appendChild(cur);
      setTimeout(finish, 600);
      return;
    }
    const { t, c } = BOOT_LINES[i++];
    const line = document.createElement("div");
    line.className = "crt-line";
    line.innerHTML = `<span class="${c}">${t || "&nbsp;"}</span>`;
    wrap.appendChild(line);
    line.style.animation = "crtline 0.05s forwards";
    setTimeout(nextLine, t ? 160 + Math.random() * 120 : 80);
  }
  nextLine();

  function finish() {
    root.classList.add("fading");
    setTimeout(() => { root.remove(); onDone && onDone(); }, 500);
  }

  const skip = () => finish();
  root.addEventListener("click", skip);
  window.addEventListener("keydown", skip, { once: true });
}

// ---- Konami ----
const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];

export function installKonami(onTrigger) {
  let buf = [];
  window.addEventListener("keydown", (e) => {
    buf.push(e.key);
    if (buf.length > KONAMI.length) buf.shift();
    const ok = buf.length === KONAMI.length && buf.every((k, i) => k.toLowerCase() === KONAMI[i].toLowerCase());
    if (ok) { buf = []; onTrigger && onTrigger(); }
  });
}

export function konamiCelebrate() {
  const overlay = document.createElement("div");
  overlay.className = "konami-overlay";
  overlay.innerHTML = `
    <div>
      <div class="konami-text">+99 LIVES</div>
      <div class="konami-sub">cheat activated :: acid mode engaged</div>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("active"));

  const colors = ["#9dff00", "#ff00aa", "#00e5ff", "#ffb300"];
  for (let i = 0; i < 80; i++) {
    const s = document.createElement("div");
    s.style.cssText = `
      position: fixed; width: 8px; height: 8px;
      left: ${Math.random() * 100}%; top: -20px;
      background: ${colors[i % colors.length]};
      box-shadow: 0 0 8px currentColor;
      z-index: 9001; pointer-events: none;
      transform: rotate(${Math.random() * 360}deg);
    `;
    overlay.appendChild(s);
    const dur = 1800 + Math.random() * 1200;
    s.animate([
      { transform: `translate(0, 0) rotate(0deg)`, opacity: 1 },
      { transform: `translate(${(Math.random() - 0.5) * 200}px, ${window.innerHeight + 40}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }
    ], { duration: dur, easing: "cubic-bezier(0.34, 0.5, 0.6, 1)" });
    setTimeout(() => s.remove(), dur);
  }
  setTimeout(() => { overlay.classList.remove("active"); setTimeout(() => overlay.remove(), 400); }, 2400);
}

// ---- Toasts ----
let toastRoot = null;
function ensureToastRoot() {
  if (!toastRoot) {
    toastRoot = document.createElement("div");
    toastRoot.className = "toasts";
    document.body.appendChild(toastRoot);
  }
  return toastRoot;
}

export function toast(msg, kind = "ok") {
  const root = ensureToastRoot();
  const t = document.createElement("div");
  t.className = "toast" + (kind === "err" ? " err" : "");
  t.textContent = msg;
  root.appendChild(t);
  setTimeout(() => t.remove(), 3100);
}
