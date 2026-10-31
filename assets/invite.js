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

  /* ---------- mép giấy xé: ảnh trong assets/bg, gắn vào đầu section có [data-tear] ---------- */
  function applyTears(root) {
    let n = 0;
    root.querySelectorAll("[data-tear]").forEach(el => {
      const flip = el.dataset.tear === "bottom";
      const v = flip ? "b" : (n++ % 3) + 1;
      const mask = `url(assets/bg/torn-mask-${v}.png)`;
      el.insertAdjacentHTML("afterbegin",
        `<div class="tear${flip ? " flip" : ""}" style="-webkit-mask-image:${mask};mask-image:${mask}" aria-hidden="true"></div>` +
        `<div class="tear-fx${flip ? " flip" : ""}" style="background-image:url(assets/bg/torn-fx-${v}.webp)" aria-hidden="true"></div>`);
    });
    alignTears();
  }
  // Mép xé lật ngược nằm giữa section: dời ảnh nền cho khớp liền với nền giấy của section chứa nó
  function alignTears() {
    app.querySelectorAll(".tear.flip").forEach(t => {
      const host = t.closest(".paper");
      if (!host) return;
      const off = t.getBoundingClientRect().top - host.getBoundingClientRect().top;
      t.style.backgroundPosition = `0 calc(${-off}px - var(--tearH))`;
    });
  }
  window.addEventListener("resize", () => alignTears());

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
      <section class="sec hero silk">
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

      <section class="sec date-sec paper" data-tear>
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
      ${safeUrl(D.wide) || show ? photo(D.wide, "wide-photo") : `<div class="gap-photo paper"></div>`}

      ${filmSlots.length || safeUrl(D.filmBig) || show ? `
      <section class="sec youth paper">
        <div class="youth-title" data-tear="bottom">
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

      <section class="sec place paper" data-tear>
        <div class="place-card">
          <div ${A("card-title", "pop", 1.3)}>Địa điểm</div>
          <div ${A("venue", "pop", 1.3)}>${esc(D.venue)}</div>
          <div class="addr">${esc(D.address)}</div>
          ${mapQ ? `<div class="map"><iframe src="https://www.google.com/maps?q=${mapQ}&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Bản đồ"></iframe></div>` : ""}
        </div>
      </section>

      ${letter ? `
      <section class="sec letter plain" data-tear>
        <h2 ${A("sec-title", "pop", 1.3)}>LƯU BÚT</h2>
        <div ${A("letter-body", "blur-in", 1)}>${letter}</div>
        <div ${A("sign", "blur-in", 2.3)}>${esc(D.signature || D.name)}</div>
      </section>` : ""}

      ${albumHtml ? `
      <section class="sec album paper" data-tear>
        <div ${A("album-title", "pop", 1.3)}>${esc(D.albumTitle)}</div>
        <div class="album-grid">${albumHtml}</div>
      </section>` : ""}

      <section class="sec wish plain" data-tear>
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
    applyTears(app);
    setupAnimations(state.rendered);
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
  const ready = () => Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 1500))]).then(() => { alignTears(); hideBoot(); });

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
