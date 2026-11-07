/* Dựng trang thiệp từ dữ liệu. Link: index.html?id=<tên-thiệp>  (hoặc /<tên-thiệp> trên GitHub Pages) */
(function () {
  const cfg = window.APP_CONFIG || {};
  const app = document.getElementById("app");
  const boot = document.getElementById("boot");
  const params = new URLSearchParams(location.search);
  const isPreview = params.has("preview");

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = u => {
    u = String(u || "").trim();
    return /^(https?:\/\/|data:image\/|data:audio\/|blob:)/i.test(u) || /^[\w][\w./-]*$/.test(u) ? u : "";
  };
  const hideBoot = () => boot && boot.classList.add("leave");

  /* ---------- ảnh ---------- */
  const photo = (src, cls = "", extra = "", inner = "") => {
    const u = safeUrl(src);
    return `<div class="ph ${cls} ${u ? "" : "empty"}" ${extra}>${u ? `<img src="${esc(u)}" alt="" loading="lazy" decoding="async">` : ""}${inner}</div>`;
  };

  /* ---------- lịch ---------- */
  function calendar(d) {
    const y = d.getFullYear(), m = d.getMonth();
    const lead = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
    let cells = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(n => `<div class="dow">${n}</div>`).join("");
    cells += "<div></div>".repeat(lead);
    for (let i = 1; i <= days; i++) cells += `<div class="d${i === d.getDate() ? " on" : ""}">${i}</div>`;
    return `<div class="cal"><div class="cal-head">${y}.${String(m + 1).padStart(2, "0")}</div>
      <div class="cal-body"><div class="wm">${y}</div><div class="cal-grid">${cells}</div></div></div>`;
  }

  /* ---------- băng đeo (sash) bay ở trang bìa ---------- */
  // đổi sáng/tối một màu hex (amt -1..1)
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16), t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    const ch = s => Math.round(((n >> s) & 255) + (t - ((n >> s) & 255)) * p);
    return "#" + [16, 8, 0].map(s => ch(s).toString(16).padStart(2, "0")).join("");
  }
  // Viền băng gợn sóng: đầu treo đứng yên, càng xuống đuôi càng bay
  function sashPath(phase, inset) {
    const BODY = 298, TIP = 330, N = 16, L = [], R = [];
    for (let i = 0; i <= N; i++) {
      const y = BODY * i / N, k = y / BODY;
      const w = Math.sin(y / 55 + phase) * 2.8 * k;
      L.push(`${(8 + inset + w).toFixed(1)} ${y.toFixed(1)}`);
      R.push(`${(72 - inset + w + Math.sin(y / 38 + phase) * 0.9 * k).toFixed(1)} ${y.toFixed(1)}`);
    }
    const tip = `${(40 + Math.sin(BODY / 55 + phase) * 3.4).toFixed(1)} ${(TIP - inset * 1.8).toFixed(1)}`;
    return `M${L.join(" L")} L${tip} L${R.reverse().join(" L")} Z`;
  }
  function sashHtml(D, accent) {
    const phases = [0, 1.57, 3.14, 4.71, 6.28];
    const anim = inset => `<animate attributeName="d" dur="3.4s" repeatCount="indefinite" values="${phases.map(p => sashPath(p, inset)).join(";")}"/>`;
    const name = (D.sashName || D.name || "").trim().toUpperCase();
    const l2 = (D.sashLine2 || "").trim(), l3 = (D.sashLine3 || "").trim(), l4 = (D.sashLine4 || "").trim();
    return `<div class="sash-wrap anim" style="--a:fade-in-down;--d:1.6s" aria-hidden="true">
      <svg class="sash" viewBox="0 0 80 340">
        <defs>
          <linearGradient id="sashFill" x1="0" x2="1">
            <stop offset="0" stop-color="${shade(accent, -0.35)}"/><stop offset=".42" stop-color="${accent}"/>
            <stop offset=".55" stop-color="${shade(accent, 0.18)}"/><stop offset="1" stop-color="${shade(accent, -0.4)}"/>
          </linearGradient>
          <linearGradient id="sashGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#f7e6a6"/><stop offset=".5" stop-color="#d6b25e"/><stop offset="1" stop-color="#b38a37"/>
          </linearGradient>
          <linearGradient id="sashSheen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity=".55"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/>
            <animateTransform attributeName="gradientTransform" type="translate" values="0 -1;0 1" dur="4.2s" repeatCount="indefinite"/>
          </linearGradient>
        </defs>
        <path d="${sashPath(0, 0)}" fill="url(#sashFill)" stroke="#e3c477" stroke-width=".8">${anim(0)}</path>
        <path d="${sashPath(0, 0)}" fill="url(#sashSheen)" opacity=".22">${anim(0)}</path>
        <path d="${sashPath(0, 3.2)}" fill="none" stroke="url(#sashGold)" stroke-width=".6" opacity=".8">${anim(3.2)}</path>
        <path d="${sashPath(0, 5)}" fill="none" stroke="url(#sashGold)" stroke-width="1.3">${anim(5)}</path>
        <g class="sash-cap" transform="translate(40 48)" fill="url(#sashGold)">
          <path d="M-10 -1 L0 -6 L10 -1 L0 4 Z"/><path d="M-6 1.6 L-6 5.2 Q0 8.6 6 5.2 L6 1.6 L0 4.6 Z"/>
          <path d="M8 -0.2 L8 6" stroke="url(#sashGold)" stroke-width=".8" fill="none"/><circle cx="8" cy="6.6" r="1.1"/>
        </g>
        <path class="sash-orn" d="M40 304 L43.5 309 L40 314 L36.5 309 Z" fill="url(#sashGold)"><animateTransform attributeName="transform" type="translate" values="0 0;1.6 0;0 0;-1.4 0;0 0" dur="3.4s" repeatCount="indefinite"/></path>
        <polygon points="8,0 72,0 72,16 8,32" fill="${shade(accent, -0.45)}"/>
        <line x1="8" y1="32" x2="72" y2="16" stroke="url(#sashGold)" stroke-width="1"/>
        ${name ? `<text class="sash-name" transform="translate(27 64) rotate(90)">${esc(name)}</text>` : ""}
        ${l2 ? `<text class="sash-l2" transform="translate(54 66) rotate(90)">${esc(l2)}</text>` : ""}
        ${l3 ? `<text class="sash-l3" x="40" y="283" text-anchor="middle">${esc(l3)}</text>` : ""}
        ${l4 ? `<text class="sash-l4" x="40" y="295" text-anchor="middle">${esc(l4)}</text>` : ""}
      </svg>
    </div>`;
  }
  // Chữ dọc quá dài thì co lại cho vừa thân băng
  function fitSash() {
    [[".sash-name", 200], [".sash-l2", 200]].forEach(([sel, max]) => {
      const t = app.querySelector(sel);
      if (!t) return;
      t.removeAttribute("textLength");
      if (t.getComputedTextLength() > max) { t.setAttribute("textLength", max); t.setAttribute("lengthAdjust", "spacingAndGlyphs"); }
    });
    [[".sash-l3", 56], [".sash-l4", 56]].forEach(([sel, max]) => {
      const t = app.querySelector(sel);
      if (t && t.getComputedTextLength() > max) { t.setAttribute("textLength", max); t.setAttribute("lengthAdjust", "spacingAndGlyphs"); }
    });
  }

  const A = (cls, a, d) => `class="${cls} anim" style="--a:${a};--d:${d}s"`;

  /* ---------- dựng trang ---------- */
  let state = { inv: null, wishes: [], album: [], rendered: false };

  function render(inv, opts = {}) {
    const D = window.Store.withDefaults(inv.data);
    const show = opts.preview; // xem trước: hiện cả khung ảnh trống
    const date = /^\d{4}-\d{2}-\d{2}$/.test(D.date) ? new Date(D.date + "T00:00:00") : new Date();
    const dows = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const film = (D.film || []).filter(safeUrl);
    const filmSlots = film.length ? film : show ? ["", "", "", ""] : [];
    const album = (D.album || []).filter(safeUrl);
    state.album = album;
    const accent = /^#[0-9a-f]{6}$/i.test(D.accent) ? D.accent : "#010e52";
    const mapQ = encodeURIComponent(D.mapQuery || [D.venue, D.address].filter(Boolean).join(", ").replace(/\n/g, " "));
    const logo = safeUrl(D.logo);
    const filmSeg = filmSlots.map(s => photo(s)).join("");
    const letter = String(D.letter || "").split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
      .map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");

    let albumHtml = "";
    const albumSlots = album.length ? album : show ? ["", "", ""] : [];
    for (let i = 0; i < albumSlots.length; i += 3) {
      const g = albumSlots.slice(i, i + 3);
      g.forEach((src, j) => {
        const wide = j === 2 || g.length === 1;
        albumHtml += photo(src, wide ? "wide" : "", `data-i="${i + j}"`);
      });
    }

    const html = `
    <main class="inv${show ? " is-preview" : ""}" style="--accent:${accent}">
      <section class="sec hero silk${D.sashOn ? " has-sash" : ""}">
        ${D.sashOn ? sashHtml(D, accent) : ""}
        <div class="school">
          <div ${A("school-logo" + (logo ? " has-img" : ""), "fade-in-down", 2)}>${logo ? `<img src="${esc(logo)}" alt="">` : esc((D.schoolEn || D.schoolVi || "U").trim().charAt(0))}</div>
          <div ${A("school-name", "fade-in-down", 3)}><b>${esc(D.schoolVi)}</b><span>${esc(D.schoolEn)}</span></div>
        </div>
        <div class="grad-title">
          <div ${A("big", "fade-in-left", 1.5)}>${esc(D.titleBig)}</div>
          <div ${A("script", "fade-in-right", 1.5)}>${esc(D.titleScript)}</div>
        </div>
        ${photo(D.hero, "hero-photo", "", `<div ${A("name", "blur-in", 1)}>${esc(D.name)}</div>`)}
        <p class="tagline">${esc(D.tagline)}</p>
      </section>

      <section class="sec date-sec"><div class="sheet"></div>
        <div class="date-card">
          <div ${A("card-title", "pop", 1.3)}>Graduation Day</div>
          <div class="time">${esc(D.timeText)}, ${dows[date.getDay()]}</div>
          <div class="date-row">
            <div class="side">THÁNG ${date.getMonth() + 1}</div>
            <div class="day">${date.getDate()}</div>
            <div class="side">NĂM ${date.getFullYear()}</div>
          </div>
          ${calendar(date)}
        </div>
      </section>
      ${safeUrl(D.wide) || show ? photo(D.wide, "wide-photo") : `<div class="gap-photo"></div>`}

      ${filmSlots.length || safeUrl(D.filmBig) || show ? `
      <section class="sec youth"><div class="sheet"></div>
        <div class="youth-title">
          <div ${A("s1", "fade-in-left", 1.5)}>${esc(D.youthTitle1)}</div>
          <div ${A("s2", "fade-in-right", 1.5)}>${esc(D.youthTitle2)}</div>
        </div>
        <div class="film-row">
          <div class="film">
            <div class="sprocket l"></div><div class="sprocket r"></div>
            <div class="film-track"><div class="film-seg">${filmSeg}</div><div class="film-seg" aria-hidden="true">${filmSeg}</div></div>
          </div>
          ${photo(D.filmBig, "film-big")}
        </div>
      </section>` : ""}

      <section class="sec place"><div class="sheet-fill"></div><div class="sheet top"></div><div class="sheet bottom"></div>
        <div class="place-card">
          <div ${A("card-title", "pop", 1.3)}>Địa điểm</div>
          <div ${A("venue", "pop", 1.3)}>${esc(D.venue)}</div>
          <div class="addr">${esc(D.address)}</div>
          ${mapQ ? `<div class="map"><iframe src="https://www.google.com/maps?q=${mapQ}&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Bản đồ"></iframe></div>` : ""}
        </div>
      </section>

      ${letter ? `
      <section class="sec letter">
        <h2 ${A("sec-title", "pop", 1.3)}>LƯU BÚT</h2>
        <div ${A("letter-body", "blur-in", 1)}>${letter}</div>
        <div ${A("sign", "blur-in", 2.3)}>${esc(D.signature || D.name)}</div>
      </section>` : ""}

      ${albumHtml ? `
      <section class="sec album"><div class="sheet-fill"></div><div class="sheet top"></div><div class="sheet bottom"></div>
        <div ${A("album-title", "pop", 1.3)}>${esc(D.albumTitle)}</div>
        <div class="album-grid">${albumHtml}</div>
      </section>` : ""}

      <section class="sec wish">
        <h2 ${A("sec-title", "pop", 1.3)}>${esc(D.wishTitle)}</h2>
        <form id="wishForm" autocomplete="off">
          <input name="n" maxlength="60" placeholder="Tên của bạn là?" required>
          <textarea name="m" maxlength="600" placeholder="Gửi lời chúc nha" required></textarea>
          <button class="send" type="submit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7Z"/></svg>
            GỬI NGAY
          </button>
          <div class="wish-msg" id="wishMsg"></div>
        </form>
        <div class="wish-list" id="wishList"></div>
      </section>

      <section class="sec thanks">
        ${photo(D.thanksImage)}
        <div class="inner">
          <h2 ${A("", "pop", 1.3)}>${esc(D.thanksTitle)}</h2>
          <p>${esc(D.thanksText)}</p>
        </div>
      </section>
    </main>
    <button class="music" id="musicBtn" aria-label="Bật/tắt nhạc" hidden><i></i><i></i><i></i><i></i></button>`;

    const y = window.scrollY;
    app.innerHTML = html;
    document.title = `${D.name} - Thiệp Mời Tốt Nghiệp`;
    document.documentElement.style.setProperty("--accent", accent);
    setupAnimations(state.rendered);
    if (D.sashOn) { fitSash(); if (document.fonts) document.fonts.ready.then(fitSash); }
    setupAlbum();
    setupWishForm(inv, opts);
    setupMusic(safeUrl(D.music));
    renderWishes();
    if (state.rendered) window.scrollTo(0, y);
    state.rendered = true;
  }

  /* ---------- hiệu ứng khi cuộn ---------- */
  let io;
  function setupAnimations(instant) {
    io && io.disconnect();
    const els = app.querySelectorAll(".anim");
    if (instant) { els.forEach(el => el.classList.add("play")); els.forEach(el => (el.style.animation = "none")); return; }
    io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("play"); io.unobserve(e.target); }
    }), { threshold: 0.12 });
    els.forEach(el => io.observe(el));
  }

  /* ---------- album + xem ảnh lớn ---------- */
  const lb = document.getElementById("lb"), lbImg = lb.querySelector("img"), lbCount = lb.querySelector(".count");
  let lbIdx = 0;
  function showLb(i, dir) {
    const list = state.album;
    if (!list.length) return;
    lbIdx = (i + list.length) % list.length;
    lbImg.classList.remove("next", "prev");
    void lbImg.offsetWidth;
    lbImg.src = list[lbIdx];
    if (dir) lbImg.classList.add(dir);
    lbCount.textContent = `${lbIdx + 1} / ${list.length}`;
    lb.classList.add("open");
  }
  function setupAlbum() {
    app.querySelectorAll(".album-grid .ph:not(.empty)").forEach(el => el.addEventListener("click", () => showLb(+el.dataset.i)));
  }
  lb.querySelector(".x").onclick = () => lb.classList.remove("open");
  lb.querySelector(".p").onclick = e => { e.stopPropagation(); showLb(lbIdx - 1, "prev"); };
  lb.querySelector(".n").onclick = e => { e.stopPropagation(); showLb(lbIdx + 1, "next"); };
  lb.addEventListener("click", e => { if (e.target === lb) lb.classList.remove("open"); });
  document.addEventListener("keydown", e => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") lb.classList.remove("open");
    if (e.key === "ArrowLeft") showLb(lbIdx - 1, "prev");
    if (e.key === "ArrowRight") showLb(lbIdx + 1, "next");
  });
  let tx = null;
  lb.addEventListener("touchstart", e => (tx = e.touches[0].clientX), { passive: true });
  lb.addEventListener("touchend", e => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 45) showLb(lbIdx + (dx < 0 ? 1 : -1), dx < 0 ? "next" : "prev");
    tx = null;
  });

  /* ---------- lời chúc ---------- */
  const fmt = t => {
    const x = new Date(t), p = n => String(n).padStart(2, "0");
    return `${p(x.getHours())}:${p(x.getMinutes())}:${p(x.getSeconds())} ${p(x.getDate())}/${p(x.getMonth() + 1)}/${x.getFullYear()}`;
  };
  function renderWishes() {
    const box = document.getElementById("wishList");
    if (!box) return;
    box.innerHTML = state.wishes.length
      ? state.wishes.map(w => `<div class="wish-item"><b>${esc(w.name)}</b><p>${esc(w.message)}</p><time>${fmt(w.created_at)}</time></div>`).join("")
      : `<div class="wish-empty">Chưa có lời nhắn nào. Hãy là người đầu tiên nhé!</div>`;
  }
  async function loadWishes(inv) {
    if (!inv.id) { state.wishes = []; return renderWishes(); }
    try { state.wishes = await window.Store.listWishes(inv.id); } catch (e) { console.warn(e); }
    renderWishes();
  }
  function setupWishForm(inv, opts) {
    const form = document.getElementById("wishForm"), msg = document.getElementById("wishMsg");
    form.addEventListener("submit", async e => {
      e.preventDefault();
      if (opts.preview) { msg.textContent = "Đang xem trước nên chưa gửi được lời chúc."; return; }
      const name = form.n.value.trim(), message = form.m.value.trim();
      if (!name || !message) return;
      const btn = form.querySelector(".send");
      btn.disabled = true; msg.textContent = "Đang gửi...";
      try {
        const w = await window.Store.addWish(inv.id, name, message);
        state.wishes.unshift(w);
        renderWishes();
        document.getElementById("wishList").scrollTop = 0;
        form.reset();
        msg.textContent = "Cảm ơn bạn đã gửi lời chúc 🤍";
      } catch (err) {
        console.error(err);
        msg.textContent = "Gửi chưa được, bạn thử lại nhé.";
      } finally { btn.disabled = false; }
    });
  }

  /* ---------- nhạc nền ---------- */
  // Trình duyệt chặn tự phát nhạc, nên nhạc bật ở lần chạm đầu tiên vào trang
  const audio = new Audio();
  audio.loop = true;
  let musicArmed = false;
  function setupMusic(src) {
    const btn = document.getElementById("musicBtn");
    if (!src) { audio.pause(); return; }
    if (audio.dataset.src !== src) { audio.src = src; audio.dataset.src = src; }
    btn.hidden = false;
    const sync = () => btn.classList.toggle("on", !audio.paused);
    audio.onplay = audio.onpause = sync;
    sync();
    btn.onclick = e => { e.stopPropagation(); audio.paused ? audio.play().catch(() => {}) : audio.pause(); };
    if (isPreview || musicArmed) return;
    musicArmed = true;
    audio.play().catch(() => {
      document.addEventListener("pointerdown", ev => {
        if (!ev.target.closest("#musicBtn")) audio.play().catch(() => {});
      }, { capture: true, once: true });
    });
  }

  /* ---------- hạt lấp lánh khi chạm ---------- */
  document.addEventListener("pointerdown", e => {
    if (e.target.closest("input,textarea,button,a,iframe,.lb")) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#1d2a5b";
    const shapes = ["♥", "✦", "•", "✧", "♥"], colors = [accent, "#c9a96e", "#e8a5b4", "#9fb3e0"];
    for (let i = 0; i < 9; i++) {
      const s = document.createElement("span");
      s.className = "burst";
      s.textContent = shapes[i % shapes.length];
      s.style.left = e.clientX + "px";
      s.style.top = e.clientY + "px";
      s.style.color = colors[i % colors.length];
      s.style.fontSize = 9 + Math.random() * 9 + "px";
      document.body.appendChild(s);
      const ang = (Math.PI * 2 * i) / 9 + Math.random() * .5, dist = 36 + Math.random() * 46;
      s.animate([
        { opacity: 0, transform: "translate(-50%,-50%) scale(.35) rotate(0deg)" },
        { opacity: 1, offset: .16 },
        { opacity: .82, offset: .68 },
        { opacity: 0, transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist}px)) scale(1) rotate(${(Math.random() - .5) * 160}deg)` }
      ], { duration: 750 + Math.random() * 300, easing: "cubic-bezier(.2,.7,.3,1)" }).onfinish = () => s.remove();
    }
  });

  /* ---------- khởi động ---------- */
  function notice(title, text) {
    app.innerHTML = `<div class="notice"><h1>${esc(title)}</h1><p>${text}</p></div>`;
    hideBoot();
  }
  const ready = () => Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 1500))]).then(hideBoot);

  async function main() {
    if (isPreview) {
      window.addEventListener("message", e => {
        if (e.origin !== location.origin || !e.data || e.data.type !== "invite-preview") return;
        const inv = e.data.invitation;
        const first = !state.inv || state.inv.id !== inv.id;
        state.inv = inv;
        render(inv, { preview: true });
        if (first) loadWishes(inv);
        ready();
      });
      parent.postMessage({ type: "invite-preview-ready" }, location.origin);
      return;
    }
    const slug = (params.get("id") || cfg.DEFAULT_SLUG || "").trim().toLowerCase();
    if (params.get("r") && slug) history.replaceState(null, "", location.pathname.replace(/[^/]*$/, "") + encodeURIComponent(slug));
    if (!slug) return notice("Thiệp Mời", `Link thiệp chưa có tên thiệp.<br>Hãy mở bằng link dạng <b>?id=ten-thiep</b> hoặc vào <a href="admin.html">trang quản lý</a>.`);
    let inv;
    try { inv = await window.Store.getInvitationBySlug(slug); }
    catch (e) { console.error(e); return notice("Có lỗi rồi", "Không tải được thiệp. Bạn thử tải lại trang nhé."); }
    if (!inv || inv.published === false) return notice("Không tìm thấy thiệp", `Không có thiệp nào tên <b>${esc(slug)}</b>.`);
    state.inv = inv;
    render(inv);
    loadWishes(inv);
    ready();
  }
  main();
})();
