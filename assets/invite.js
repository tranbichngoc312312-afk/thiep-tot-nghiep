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

  /* ---------- 2 dải băng (sash) thả ở 2 góc trên trang bìa: vẽ bằng canvas, uốn theo gió như vải thật ---------- */
  // đổi sáng/tối một màu hex (amt -1..1)
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16), t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    const ch = s => Math.round(((n >> s) & 255) + (t - ((n >> s) & 255)) * p);
    return "#" + [16, 8, 0].map(s => ch(s).toString(16).padStart(2, "0")).join("");
  }
  // một dải vẽ ở 80 x 350 đơn vị (1 đơn vị = 0.7656u): thân thẳng tới BODY rồi nhọn 45° xuống TIP; PAD = chỗ trống 2 bên cho vải bay
  const SW = 80, SH = 350, PAD = 16, BODY = 307, TIP = 341;
  const PIPE = 7;                          // đường viền trắng thụt vào trong mép
  const WHITE = "#f2f3f6", LACE = "rgba(247,248,251,.97)";
  const CAP = "M-10 -1 L0 -6 L10 -1 L0 4 Z M-6 1.6 L-6 5.2 Q0 8.6 6 5.2 L6 1.6 L0 4.6 Z";
  let stopSash = () => {};

  // chữ viết tắt từ tên trường tiếng Anh: "Van Hien University" -> "VHU"
  const initials = s => String(s || "").split(/\s+/).filter(w => w && !/^(of|the|and|for|&)$/i.test(w)).map(w => w[0]).join("").toUpperCase().slice(0, 6);

  function sashHtml() {
    return `<div class="sash-wrap left anim" style="--a:sash-unfurl;--d:1.1s" aria-hidden="true"><canvas class="sash"></canvas></div>
      <div class="sash-wrap right anim" style="--a:sash-unfurl;--d:1.4s" aria-hidden="true"><canvas class="sash"></canvas></div>`;
  }

  // dải băng thụt vào i đơn vị: 2 cạnh thẳng, đuôi chữ V song song với mép ngoài
  const VK = (TIP - BODY) / 32, VS = Math.hypot(1, VK);
  const bend = i => BODY + i * VK - i * VS;
  const bandPath = i => new Path2D(`M${8 + i} -2 L${72 - i} -2 L${72 - i} ${bend(i)} L40 ${TIP - i * VS} L${8 + i} ${bend(i)} Z`);

  // ren trắng nằm trong chữ V của đường viền: hàng vòng ngang + hoa văn xoắn thu nhỏ dần về mũi
  function drawLace(g, col = LACE, net = "rgba(240,242,248,.22)") {
    const yb = bend(PIPE), inner = bandPath(PIPE + 0.8), cx = 40;
    g.save();
    g.clip(inner);
    // lưới ren mảnh ở nửa trên
    g.strokeStyle = net; g.lineWidth = 0.3;
    for (let d = -40; d < 90; d += 2.6) {
      g.beginPath(); g.moveTo(d, yb); g.lineTo(d + 22, yb + 22); g.stroke();
      g.beginPath(); g.moveTo(d + 22, yb); g.lineTo(d, yb + 22); g.stroke();
    }
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 0.55;
    // hàng vòng ren ngay dưới chỗ gập
    g.beginPath(); g.moveTo(14, yb + 0.6); g.lineTo(66, yb + 0.6); g.stroke();
    for (let x = 17.6; x <= 62.5; x += 2.9) {
      g.beginPath(); g.arc(x, yb + 0.6, 1.45, 0, Math.PI); g.stroke();
      g.beginPath(); g.arc(x, yb + 3.4, 0.42, 0, Math.PI * 2); g.fill();
    }
    // bông giữa
    const top = yb + 4.2;
    g.lineWidth = 0.6;
    g.beginPath(); g.moveTo(cx, top); g.quadraticCurveTo(cx + 4.6, top + 6.5, cx, top + 14); g.quadraticCurveTo(cx - 4.6, top + 6.5, cx, top); g.stroke();
    g.beginPath(); g.moveTo(cx, top + 2.4); g.quadraticCurveTo(cx + 2.2, top + 6.5, cx, top + 11); g.quadraticCurveTo(cx - 2.2, top + 6.5, cx, top + 2.4); g.fill();
    // lá xoắn 3 tầng 2 bên
    [[top + 0.6, 21, 1], [top + 6.8, 14.5, 0.85], [top + 12.6, 8.5, 0.7]].forEach(([y, w, k]) => [-1, 1].forEach(d => {
      g.lineWidth = 0.55 * k + 0.1;
      g.beginPath(); g.moveTo(cx + 3.2 * d, y + 4.2 * k);
      g.bezierCurveTo(cx + w * 0.42 * d, y - 2.4 * k, cx + w * d, y - 0.6 * k, cx + w * 0.86 * d, y + 3.8 * k);
      g.bezierCurveTo(cx + w * 0.74 * d, y + 7 * k, cx + w * 0.44 * d, y + 5.6 * k, cx + w * 0.52 * d, y + 2.6 * k);
      g.stroke();
      g.beginPath(); g.arc(cx + w * 0.62 * d, y + 3.2 * k, 0.75 * k, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(cx + w * 0.98 * d, y + 7 * k, 0.55, 0, Math.PI * 2); g.fill();
    }));
    g.beginPath(); g.arc(cx, top + 17, 0.9, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  // Tấm vải phẳng: satin xanh đúng màu chủ đạo, 1 đường viền trắng thụt vào, đuôi nhọn có ren trắng
  function drawSashBase(g, accent, mirror) {
    const band = bandPath(0);
    const fill = g.createLinearGradient(8, 0, 72, 0);
    fill.addColorStop(0, shade(accent, -0.28)); fill.addColorStop(0.14, accent);
    fill.addColorStop(0.5, shade(accent, 0.02)); fill.addColorStop(0.86, accent); fill.addColorStop(1, shade(accent, -0.3));
    g.fillStyle = fill;
    g.fill(band);
    g.save();
    g.clip(band);
    for (let x = 8; x < 72; x += 0.7) { g.fillStyle = `rgba(255,255,255,${0.004 + ((x * 13) % 5) / 700})`; g.fillRect(x, 0, 0.25, SH); }
    const hx = mirror ? 50 : 30, hl = g.createLinearGradient(hx - 9, 0, hx + 9, 0);
    hl.addColorStop(0, "rgba(255,255,255,0)"); hl.addColorStop(0.5, "rgba(255,255,255,.045)"); hl.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = hl; g.fillRect(hx - 9, 0, 18, SH);
    // mép ngoài của đuôi bắt sáng
    g.strokeStyle = "rgba(255,255,255,.45)"; g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(8, BODY); g.lineTo(40, TIP); g.lineTo(72, BODY); g.stroke();
    g.restore();
    g.lineJoin = "miter";
    g.strokeStyle = shade(accent, -0.5); g.lineWidth = 0.7; g.stroke(band);
    // đường viền trắng chạy dọc 2 bên rồi theo chữ V
    g.strokeStyle = WHITE; g.lineWidth = 1.9; g.stroke(bandPath(PIPE));
    drawLace(g);
  }

  // gạch trang trí trắng: ——•◆•——
  function sashDivider(g, y) {
    g.strokeStyle = WHITE; g.fillStyle = WHITE; g.lineWidth = 0.5;
    g.beginPath(); g.moveTo(20.5, y); g.lineTo(36, y); g.moveTo(44, y); g.lineTo(59.5, y); g.stroke();
    g.beginPath(); g.moveTo(40, y - 1.4); g.lineTo(41.7, y); g.lineTo(40, y + 1.4); g.lineTo(38.3, y); g.closePath(); g.fill();
    [36.9, 43.1].forEach(x => { g.beginPath(); g.arc(x, y, 0.5, 0, Math.PI * 2); g.fill(); });
  }

  // Phần đầu kiểu băng: 2 dải băng, trường căn giữa, "Graduation Ceremony" + mũ, họ tên viết tay, câu trích
  function sashHeader(D, logo) {
    const big = String(D.titleBig || "Graduation").trim(), sc = String(D.titleScript || "Ceremony").trim();
    const G = big.charAt(0).toUpperCase(), rest = big.slice(1).toLowerCase();
    // "Đại học Văn Hiến" -> 2 dòng "ĐẠI HỌC" / "VĂN HIẾN" như mẫu
    const vi = String(D.schoolVi || "").trim();
    const m = vi.match(/^((?:trường\s+)?(?:đại học|cao đẳng|học viện|trung học phổ thông|thpt))\s+(.+)$/iu);
    const viHtml = m ? `<b>${esc(m[1])}</b><b>${esc(m[2])}</b>` : `<b>${esc(vi)}</b>`;
    return `${sashHtml()}
        <div ${A("sx-school", "fade-in-down", 2)}>
          ${logo ? `<img class="sx-logo" src="${esc(logo)}" alt="">` : ""}
          <div class="sx-school-name">${viHtml}<span>${esc(D.schoolEn)}</span></div>
        </div>
        <div class="sx-title">
          <svg class="sx-cap" viewBox="-13 -8 26 18" aria-hidden="true"><path d="${CAP}"/><path d="M8 -0.2 L8 6" stroke="currentColor" stroke-width=".9" fill="none"/><circle cx="8" cy="6.8" r="1.2"/></svg>
          <div ${A("sx-grad", "fade-in-left", 1.5)}><span class="sx-g">${esc(G)}</span><span class="sx-sq">${esc(rest)}</span></div>
          <div ${A("sx-cere", "fade-in-right", 1.5)}><span class="sx-sq">${esc(sc.slice(0, -1))}</span><span class="sx-y">${esc(sc.slice(-1))}</span></div>
        </div>
        <div ${A("sx-name", "blur-in", 1.6)}>${esc(D.name)}</div>
        ${D.sxInvite ? `<p ${A("sx-invite", "blur-in", 1.8)}>${esc(D.sxInvite)}</p>` : ""}`;
  }
  // họ tên viết tay không xuống dòng: dài quá thì thu nhỏ chữ cho vừa
  function fitSxName() {
    const el = app.querySelector(".sx-name, .lk-name");
    if (!el) return;
    el.style.fontSize = "";
    let size = parseFloat(getComputedStyle(el).fontSize);
    while (el.scrollWidth > el.clientWidth + 1 && size > 14) { size -= 1; el.style.fontSize = size + "px"; }
  }

  // chữ vàng (chữ viết tắt, K23) và chữ trắng bạc (Class of, tên dọc, ngành)
  function goldText(g, y0, y1) {
    const tg = g.createLinearGradient(0, y0, 0, y1);
    tg.addColorStop(0, "#f4d987"); tg.addColorStop(0.5, "#d9ad45"); tg.addColorStop(1, "#a97c24");
    return tg;
  }
  function silverText(g, y0, y1) {
    const tg = g.createLinearGradient(0, y0, 0, y1);
    tg.addColorStop(0, "#ffffff"); tg.addColorStop(0.55, "#eceef2"); tg.addColorStop(1, "#c9cdd5");
    return tg;
  }
  // chữ in trên vải: bóng tối mảnh phía dưới rồi chữ
  function printText(g, text, x, y, font, fill) {
    g.font = font;
    g.fillStyle = "rgba(0,0,0,.45)"; g.fillText(text, x + 0.35, y + 0.5);
    g.fillStyle = fill; g.fillText(text, x, y);
  }

  // bỏ nền trắng quanh logo (chỉ phần trắng nối ra mép ảnh) để logo nằm thẳng trên vải như mẫu
  function knockWhite(img) {
    try {
      const k = Math.min(1, 260 / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
      const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
      const g = cv.getContext("2d"); g.drawImage(img, 0, 0, w, h);
      const d = g.getImageData(0, 0, w, h), p = d.data, gone = new Uint8Array(w * h), st = [];
      const light = i => p[i * 4 + 3] < 24 || (p[i * 4] > 222 && p[i * 4 + 1] > 222 && p[i * 4 + 2] > 222);
      for (let x = 0; x < w; x++) st.push(x, (h - 1) * w + x);
      for (let y = 0; y < h; y++) st.push(y * w, y * w + w - 1);
      while (st.length) {
        const i = st.pop();
        if (gone[i] || !light(i)) continue;
        gone[i] = 1; p[i * 4 + 3] = 0;
        const x = i % w;
        if (x > 0) st.push(i - 1);
        if (x < w - 1) st.push(i + 1);
        if (i >= w) st.push(i - w);
        if (i < w * (h - 1)) st.push(i + w);
      }
      // làm mềm viền: điểm sáng sát chỗ đã bỏ thì trong bớt
      for (let i = 0; i < w * h; i++) {
        if (gone[i]) continue;
        const x = i % w;
        if (!((x > 0 && gone[i - 1]) || (x < w - 1 && gone[i + 1]) || (i >= w && gone[i - w]) || (i < w * (h - 1) && gone[i + w]))) continue;
        const lo = Math.min(p[i * 4], p[i * 4 + 1], p[i * 4 + 2]);
        if (lo > 150) p[i * 4 + 3] = Math.round(p[i * 4 + 3] * Math.max(0, (255 - lo) / 105));
      }
      g.putImageData(d, 0, 0);
      if (!gone.some(v => v)) return { img: cv, w, h, clean: false };
      let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let i = 0; i < w * h; i++) if (p[i * 4 + 3] > 16) { const x = i % w, y = (i - x) / w; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) return { img, w: img.naturalWidth, h: img.naturalHeight, clean: false };
      const out = document.createElement("canvas"); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
      out.getContext("2d").drawImage(cv, -x0, -y0);
      return { img: out, w: out.width, h: out.height, clean: true };
    } catch (e) {
      return { img, w: img.naturalWidth, h: img.naturalHeight, clean: false };
    }
  }

  // Dải trái: logo trường, gạch trang trí, chữ viết tắt vàng xếp dọc, "Class / of / <năm>" màu trắng
  function drawLeftSash(g, accent, c) {
    drawSashBase(g, accent, false);
    if (c.logo) {
      const L = c.logo, r = Math.min(32 / L.w, 35 / L.h), w = L.w * r, h = L.h * r;
      g.save();
      if (!L.clean) {
        const rr = Math.max(w, h) / 2 + 1;
        g.fillStyle = "#fff"; g.beginPath(); g.arc(40, 34, rr, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(40, 34, rr - 0.4, 0, Math.PI * 2); g.clip();
      }
      g.drawImage(L.img, 40 - w / 2, 34 - h / 2, w, h);
      g.restore();
    } else {
      g.save(); g.translate(40, 34); g.scale(1.6, 1.6); g.fillStyle = goldText(g, -6, 8); g.fill(new Path2D(CAP)); g.restore();
    }
    sashDivider(g, 55);
    const letters = [...c.letters];
    if (letters.length) {
      const top = 98, bottom = 234, gap = letters.length > 1 ? Math.min(45.3, (bottom - top) / (letters.length - 1)) : 0;
      const size = Math.min(28.5, gap ? gap * 0.68 : 28.5), start = top + (bottom - top - gap * (letters.length - 1)) / 2;
      g.textAlign = "center"; g.textBaseline = "middle";
      letters.forEach((ch, i) => printText(g, ch, 40, start + gap * i + size * 0.03, `700 ${size}px "Cinzel", "Playfair Display", serif`, goldText(g, start + gap * i - size * 0.36, start + gap * i + size * 0.36)));
    }
    // "Class  2026" trên, "of" nhỏ phía dưới như con dấu
    const fy = 281, fClass = `italic 600 9px "Noto Serif", serif`, fYear = `700 8.6px "Playfair Display", serif`;
    g.textBaseline = "alphabetic";
    g.font = fClass; const wc = g.measureText("Class").width;
    g.font = fYear; const wy = c.year ? g.measureText(c.year).width : 0;
    const gx = 40 - (wc + (wy ? 2 + wy : 0)) / 2 + wc;
    g.textAlign = "right"; printText(g, "Class", gx, fy, fClass, silverText(g, fy - 7, fy));
    g.textAlign = "center"; printText(g, "of", gx - 3.6, fy + 6.6, `italic 400 8px "Noto Serif", serif`, silverText(g, fy + 1, fy + 7));
    if (wy) { g.textAlign = "left"; printText(g, c.year, gx + 2, fy + 2.6, fYear, silverText(g, fy - 4, fy + 3)); }
  }

  // Dải phải: chữ vàng nghiêng trên đầu (vd K23), gạch trang trí, họ tên viết tay in dọc màu bạc, chữ ngành nhỏ ở đuôi
  function drawRightSash(g, accent, c) {
    drawSashBase(g, accent, true);
    g.textAlign = "center"; g.textBaseline = "alphabetic";
    if (c.top) {
      g.font = `italic 500 19px "Noto Serif", serif`;
      const k = Math.min(1, 42 / g.measureText(c.top).width);
      g.save(); g.translate(40, 38); g.scale(k, k); printText(g, c.top, 0, 0, g.font, goldText(g, -15, 1)); g.restore();
    }
    sashDivider(g, 48);
    let y1 = 292;
    if (c.bottom) {
      const font = `italic 600 5.8px "Noto Serif", serif`, lines = [];
      g.font = font;
      c.bottom.split(/\s+/).forEach(w => {
        const last = lines[lines.length - 1];
        if (last && g.measureText(last + " " + w).width <= 47) lines[lines.length - 1] = last + " " + w; else lines.push(w);
      });
      const shown = lines.slice(0, 4), lh = 8, y0 = 287 - lh * (shown.length - 1);
      shown.forEach((ln, i) => printText(g, ln, 40, y0 + lh * i, font, silverText(g, y0 + lh * i - 6, y0 + lh * i)));
      y1 = y0 - 13;
    }
    if (c.name) {
      const y0 = 72;
      g.save();
      g.translate(40, (y0 + y1) / 2);
      g.rotate(Math.PI / 2);
      g.font = `400 21px "Great Vibes", cursive`;
      const tw = g.measureText(c.name).width, max = y1 - y0;
      if (tw > max) g.scale(max / tw, max / tw);
      g.textBaseline = "middle";
      printText(g, c.name, 0, 0, g.font, silverText(g, -9, 9));
      g.restore();
    }
  }

  /* ---------- băng đeo của mẫu "Lụa trắng": vải trắng, viền màu chủ đạo, chữ xanh đậm ---------- */
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
  function drawSashBaseLight(g, accent) {
    const band = bandPath(0);
    const fill = g.createLinearGradient(8, 0, 72, 0);
    fill.addColorStop(0, "#d6dce6"); fill.addColorStop(0.13, "#f6f8fb"); fill.addColorStop(0.5, "#ffffff");
    fill.addColorStop(0.87, "#f2f5f9"); fill.addColorStop(1, "#d2d9e4");
    g.fillStyle = fill;
    g.fill(band);
    g.save();
    g.clip(band);
    for (let x = 8; x < 72; x += 0.7) { g.fillStyle = `rgba(20,40,90,${0.006 + ((x * 13) % 5) / 1000})`; g.fillRect(x, 0, 0.25, SH); }
    g.restore();
    g.lineJoin = "miter";
    g.strokeStyle = accent; g.lineWidth = 4.2; g.stroke(bandPath(2.1));
    g.strokeStyle = rgba(accent, 0.45); g.lineWidth = 0.7; g.stroke(bandPath(6.4));
    drawLace(g, accent, rgba(accent, 0.1));
  }
  const lightRule = (g, accent, y) => { g.strokeStyle = accent; g.lineWidth = 0.8; g.beginPath(); g.moveTo(15, y); g.lineTo(65, y); g.stroke(); };

  // Dải trái: logo, gạch ngang, chữ viết tắt xếp dọc, "CLASS / OF / <năm>"
  function drawLeftSashLight(g, accent, c) {
    const ink = shade(accent, -0.3);
    drawSashBaseLight(g, accent);
    if (c.logo) {
      const L = c.logo, r = Math.min(30 / L.w, 32 / L.h), w = L.w * r, h = L.h * r;
      g.drawImage(L.img, 40 - w / 2, 30 - h / 2, w, h);
    } else {
      g.save(); g.translate(40, 30); g.scale(1.6, 1.6); g.fillStyle = ink; g.fill(new Path2D(CAP)); g.restore();
    }
    lightRule(g, accent, 59);
    const letters = [...c.letters];
    g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = ink;
    if (letters.length) {
      const top = 93, bottom = 178, gap = letters.length > 1 ? Math.min(42, (bottom - top) / (letters.length - 1)) : 0;
      const size = Math.min(28, gap ? gap * 0.7 : 28), start = top + (bottom - top - gap * (letters.length - 1)) / 2;
      g.font = `700 ${size}px "Playfair Display", serif`;
      letters.forEach((ch, i) => g.fillText(ch, 40, start + gap * i + size * 0.04));
    }
    g.font = `700 10px "Playfair Display", serif`;
    // chữ dưới cùng: tự nhập trong CMS (mỗi dòng một hàng) hoặc mặc định CLASS / OF / năm; dòng dài thì thu nhỏ cho vừa băng
    const rows = c.classLines.length ? c.classLines : ["CLASS", "OF", c.year].filter(Boolean);
    rows.forEach((t, i) => {
      const k = Math.min(1, 46 / g.measureText(t).width);
      g.save(); g.translate(40, 237 + i * 13); g.scale(k, k); g.fillText(t, 0, 0); g.restore();
    });
  }

  // Dải phải: chữ trên đầu (vd K25), gạch ngang, họ tên viết tay in dọc + dòng chữ nhỏ in dọc bên cạnh
  function drawRightSashLight(g, accent, c) {
    const ink = shade(accent, -0.3);
    drawSashBaseLight(g, accent);
    g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillStyle = ink;
    if (c.top) {
      g.font = `700 26px "Playfair Display", serif`;
      const k = Math.min(1, 48 / g.measureText(c.top).width);
      g.save(); g.translate(40, 41); g.scale(k, k); g.fillText(c.top, 0, 0); g.restore();
    }
    lightRule(g, accent, 59);
    const y0 = 78, y1 = 268, small = c.bottom;
    const vertical = (text, x, font, max) => {
      g.save();
      g.translate(x, (y0 + y1) / 2);
      g.rotate(Math.PI / 2);
      g.font = font;
      const tw = g.measureText(text).width;
      if (tw > max) g.scale(max / tw, max / tw);
      g.textBaseline = "middle";
      g.fillText(text, 0, 0);
      g.restore();
    };
    if (c.name) vertical(c.name, small ? 47 : 40, `400 23px "Great Vibes", cursive`, y1 - y0);
    if (small) vertical(small.toUpperCase(), 24, `500 8px "Playfair Display", serif`, 170);
  }

  function startSash(D, accent, light) {
    stopSash();
    const wraps = [...app.querySelectorAll(".sash-wrap")];
    if (!wraps.length) return;
    const year = /^\d{4}/.test(D.date || "") ? D.date.slice(0, 4) : "";
    const content = {
      logo: null,
      letters: (D.sashLetters || initials(D.schoolEn) || initials(D.schoolVi)).replace(/\s+/g, "").toUpperCase().slice(0, 6),
      year,
      top: (D.sashTop || "").trim(),
      name: (D.sashName || D.name || "").trim(),
      bottom: (D.sashBottom || "").trim() || (light && year ? `Graduation · ${year}` : ""),
      classLines: String(D.sashClass || "").split("\n").map(t => t.trim()).filter(Boolean).slice(0, 3)
    };
    const drawLeft = light ? drawLeftSashLight : drawLeftSash, drawRight = light ? drawRightSashLight : drawRightSash;
    const cloths = wraps.map((wrap, i) => ({ wrap, cv: wrap.querySelector("canvas"), tex: document.createElement("canvas"), right: wrap.classList.contains("right"), off: i * 1.7 }));
    let S = 1, ready = false, raf = 0, t0 = 0;
    const settled = app.classList.contains("instant"); // xem trước trong CMS: bỏ qua đoạn tung ra
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const rebuild = () => {
      const unit = cloths[0].wrap.getBoundingClientRect().width / SW;
      if (!unit) return;
      S = unit * Math.min(3, window.devicePixelRatio || 1);
      cloths.forEach(c => {
        c.cv.width = Math.ceil((SW + PAD * 2) * S);
        c.cv.height = Math.ceil((SH + 8) * S);
        c.tex.width = Math.ceil(SW * S);
        c.tex.height = Math.ceil(SH * S);
        const g = c.tex.getContext("2d");
        g.scale(S, S);
        (c.right ? drawRight : drawLeft)(g, accent, content);
      });
      ready = true;
      if (!raf) draw(performance.now());
    };

    // Mỗi lát ngang của tấm vải lệch theo sóng gió chạy dọc xuống; đầu dải đứng yên, đuôi bay nhiều
    function drawCloth(c, t, settle, gust) {
      const ctx = c.cv.getContext("2d"), tex = c.tex;
      const step = Math.max(1, Math.round(S * 1.2));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.cv.width, c.cv.height);
      for (let py = 0; py < tex.height; py += step) {
        const y = py / S, k = y / SH, tt = t + c.off;
        const amp = Math.pow(k, 1.35) * settle * gust;
        const ph = y / 52 - tt * (c.right ? 1.75 : 1.9);
        const dx = amp * (4.2 * Math.sin(ph) + 1.3 * Math.sin(ph * 2.2 + 1.3)) + Math.sin(tt * 0.5) * 3.5 * k * settle;
        const slope = amp * (4.2 * Math.cos(ph) + 1.3 * 2.2 * Math.cos(ph * 2.2 + 1.3)) / 52;
        const twist = 1 - Math.min(0.22, Math.abs(Math.sin(ph * 0.5 + tt * 0.35)) * 0.18 * k * settle);
        const w = tex.width * twist, x = PAD * S + (tex.width - w) / 2 + dx * S;
        const sh = Math.min(step, tex.height - py);
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(tex, 0, py, tex.width, sh, x, py, w, sh + 1);
        // sáng/tối theo độ nghiêng của vải (ánh sáng từ trên trái) + chỗ xoắn thì tối hơn
        const lit = Math.max(-0.32, Math.min(0.26, slope * 4.5)) - (1 - twist) * 0.8;
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = lit > 0 ? `rgba(255,255,255,${(lit * 0.5).toFixed(3)})` : `rgba(0,0,18,${(-lit).toFixed(3)})`;
        ctx.fillRect(x - 1, py, w + 2, step + 1);
      }
      ctx.globalCompositeOperation = "source-over";
    }
    function draw(now) {
      if (!ready) return;
      if (!t0) t0 = now - (settled || reduce ? 20000 : 0);
      const t = (now - t0) / 1000;
      const settle = 1 + 2 * Math.exp(-t / 1.1);                                   // vừa tung ra bay mạnh, dịu dần
      const gust = 0.72 + 0.2 * Math.sin(t * 0.37) + 0.12 * Math.sin(t * 0.93 + 1); // gió lúc mạnh lúc nhẹ
      cloths.forEach(c => drawCloth(c, t, settle, gust));
    }

    const tick = now => { draw(now); raf = requestAnimationFrame(tick); };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !raf && !reduce) raf = requestAnimationFrame(tick);
      if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
    });
    io.observe(cloths[0].wrap);
    window.addEventListener("resize", rebuild);
    stopSash = () => { cancelAnimationFrame(raf); raf = 0; io.disconnect(); window.removeEventListener("resize", rebuild); };

    const logoUrl = safeUrl(D.logo);
    if (logoUrl) {
      // tải kèm CORS để bỏ được nền trắng; máy chủ không cho thì tải thường (logo nằm trong vòng tròn trắng)
      const load = cors => {
        const im = new Image();
        if (cors) im.crossOrigin = "anonymous";
        im.onload = () => {
          content.logo = knockWhite(im);
          const el = app.querySelector(".sx-logo");
          if (content.logo.clean && el) try { el.src = content.logo.img.toDataURL(); } catch (e) {}
          rebuild();
        };
        im.onerror = () => { if (cors) load(false); };
        im.src = logoUrl;
      };
      load(true);
    }
    rebuild();
    if (document.fonts) Promise.all(['700 27px "Cinzel"', 'italic 600 16px "Noto Serif"', 'italic 500 16px "Noto Serif"', 'italic 400 16px "Noto Serif"', '700 16px "Playfair Display"', '400 21px "Great Vibes"'].map(f => document.fonts.load(f))).then(rebuild, () => {});
  }

  const A = (cls, a, d) => `class="${cls} anim" style="--a:${a};--d:${d}s"`;

  /* ---------- mẫu "Lụa trắng" ---------- */
  // mũ tốt nghiệp xanh đậm
  const silkCap = `<svg class="lk-cap" viewBox="0 0 120 92" aria-hidden="true">
    <defs>
      <linearGradient id="lkTop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1c2a66"/><stop offset=".5" stop-color="#0a1858"/><stop offset="1" stop-color="#010e52"/></linearGradient>
      <linearGradient id="lkBody" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#010a3c"/><stop offset=".6" stop-color="#0d1c5e"/><stop offset="1" stop-color="#010a3c"/></linearGradient>
    </defs>
    <g>
      <path d="M26 44 L28 68 Q60 82 92 66 L90 43 Q58 56 26 44Z" fill="url(#lkBody)"/>
      <path d="M3 34 L62 11 L117 36 L58 59 Z" fill="url(#lkTop)"/>
      <path d="M3 34 L58 59 L117 36 L117 39.5 L58 62.5 L3 37.5Z" fill="#020b3d"/>
    </g>
    <circle cx="60" cy="35" r="2.6" fill="#020b3d"/>
    <path d="M60 35 Q84 39 99 45 L100 70" stroke="#020b3d" stroke-width="1.6" fill="none"/>
    <path d="M97.5 68 L102.5 68 L105 88 L95 88Z" fill="#0a1858"/>
  </svg>`;

  function silkPage(D, o) {
    const big = String(D.titleBig || "Graduation").trim(), sc = String(D.titleScript || "Ceremony").trim();
    const counter = [["NGÀY"], ["GIỜ"], ["PHÚT"], ["GIÂY"]].map(([l]) => `<div><b>00</b><span>${l}</span></div>`).join("");
    const rsvpOn = D.rsvpOn !== false;
    return `
    <main class="inv theme-silk${o.show ? " is-preview" : ""}" style="--accent:${o.accent}">
      <section class="sec lk-hero">
        ${sashHtml()}
        <div ${A("lk-school", "fade-in-down", 2)}>
          ${o.logo ? `<img class="sx-logo" src="${esc(o.logo)}" alt="">` : `<span class="lk-logo-ph" title="Tải logo trường trong trang quản lý"><svg viewBox="-13 -8 26 18" aria-hidden="true"><path d="${CAP}"/></svg></span>`}
          <div class="lk-school-name"><b>${esc(D.schoolVi)}</b><span>${esc(D.schoolEn)}</span></div>
        </div>
        <div class="lk-title">
          ${silkCap}
          <div ${A("lk-grad", "fade-in-left", 1.5)}><span class="lk-g">${esc(big.charAt(0).toUpperCase())}</span>${esc(big.slice(1).toLowerCase())}</div>
          <div ${A("lk-cere", "fade-in-right", 1.5)}>${esc(sc.slice(0, -1))}<span class="lk-y">${esc(sc.slice(-1))}</span></div>
        </div>
        ${D.inviteLine ? `<p ${A("lk-invite", "blur-in", 1.6)}>${esc(D.inviteLine)}</p>` : ""}
        <div ${A("lk-name", "blur-in", 1.6)}>${esc(D.name)}</div>
        ${photo(D.hero, "lk-photo")}
      </section>

      <section class="sec lk-date">
        <div ${A("lk-month", "pop", 1.2)}>THÁNG ${o.date.getMonth() + 1}</div>
        <div class="lk-date-row">
          <div class="side">${esc(o.dow.toUpperCase())}</div>
          <div ${A("day", "pop", 1.2)}>${o.date.getDate()}</div>
          <div class="side">${esc(o.hhmm || D.timeText)}</div>
        </div>
        <div class="lk-year">${o.date.getFullYear()}</div>
        <div class="lk-count" id="countdown">${counter}</div>
      </section>

      ${o.slots.length ? `
      <section class="sec lk-moments">
        <h2 ${A("lk-script", "blur-in", 1.6)}>${esc(D.momentTitle)}</h2>
        <div ${A("ring", "fl-in", 1.6)}>
          <div class="ring-floor"></div>
          <div class="ring-stage">${ringItems(o.slots).map(([src, i]) => `<div class="ring-item">${photo(src, "ring-card", `data-i="${i}"`)}</div>`).join("")}</div>
          ${SPARKS.map(([x, y, sz, t, dl]) => `<i class="fl-spark" style="left:${x}%;top:${y}%;--s:${sz};--t:${t}s;--dl:-${dl}s"></i>`).join("")}
        </div>
        <div class="ring-count"></div>
      </section>` : ""}

      ${rsvpOn ? `<div class="lk-rsvp-wrap"><button class="lk-btn" id="rsvpBtn" type="button">XÁC NHẬN THAM DỰ</button></div>` : ""}

      ${o.placeSec}
      ${o.wishSec}
      ${o.thanksSec}
    </main>
    ${rsvpOn ? `
    <div class="rsvp" id="rsvp" role="dialog" aria-label="Xác nhận tham dự">
      <form class="rsvp-card" autocomplete="off">
        <button type="button" class="x" aria-label="Đóng">×</button>
        <h3>Xác nhận tham dự</h3>
        <p class="rsvp-sub">${esc(D.name)} rất mong được gặp bạn 🤍</p>
        <input name="n" maxlength="60" placeholder="Tên của bạn" required>
        <div class="rsvp-opt">
          <label><input type="radio" name="go" value="yes" checked><span>Mình sẽ đến</span></label>
          <label><input type="radio" name="go" value="no"><span>Tiếc quá, mình bận</span></label>
        </div>
        <label class="rsvp-cnt">Số người tham dự
          <select name="c">${[1, 2, 3, 4, 5].map(n => `<option value="${n}">${n} người</option>`).join("")}</select>
        </label>
        <textarea name="m" maxlength="500" placeholder="Lời nhắn (không bắt buộc)"></textarea>
        <button class="lk-btn" type="submit">GỬI XÁC NHẬN</button>
        <div class="rsvp-msg"></div>
      </form>
    </div>` : ""}
    ${o.musicBtn}`;
  }

  /* ---------- đếm ngược ---------- */
  let cdTimer = 0;
  function setupCountdown(target) {
    clearInterval(cdTimer);
    const cells = [...app.querySelectorAll("#countdown b")];
    if (!cells.length || !target) return;
    const tick = () => {
      const s = Math.max(0, Math.floor((target - Date.now()) / 1000));
      const v = [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
      cells.forEach((c, i) => { const t = String(v[i]).padStart(2, "0"); if (c.textContent !== t) c.textContent = t; });
      if (!s) clearInterval(cdTimer);
    };
    tick();
    cdTimer = setInterval(tick, 1000);
  }

  /* ---------- "Khoảnh khắc thanh xuân": ảnh chạy vòng, ảnh giữa to, 2 ảnh 2 bên nhỏ; tự chuyển, vuốt để chuyển, chạm ảnh giữa để xem lớn ---------- */
  // ít ảnh thì lặp lại cho đủ 5 để vòng chạy liền
  const ringItems = slots => {
    if (!slots.length) return [];
    const n = Math.max(5, slots.length);
    return Array.from({ length: n }, (_, k) => [slots[k % slots.length], k % slots.length]);
  };
  // hạt sáng: [x %, y %, cỡ, thời gian, trễ]
  const SPARKS = [[8, 12, 3, 4.2, 1], [22, 92, 2, 5, 3], [38, 6, 2.5, 3.6, 2], [58, 96, 3, 4.8, 0], [71, 30, 2, 3.9, 2.5],
    [92, 48, 3.5, 5.2, 1.5], [96, 88, 2, 4.4, 4], [4, 64, 2.5, 3.7, 0.5], [48, 58, 2, 4.6, 3.3], [64, 74, 2.5, 5.5, 1.2],
    [30, 40, 2, 4.1, 2.2], [84, 8, 2.5, 4.9, 0.8]];
  // Ảnh trôi liên tục trên một vòng: ảnh ở giữa to nhất, càng ra 2 bên càng nhỏ và lùi ra sau rồi mờ dần.
  // Mỗi khung hình chỉ đổi transform/opacity của vài ảnh đang thấy nên chạy mượt.
  let ringStop = () => {};
  function setupRing() {
    ringStop();
    const box = app.querySelector(".ring");
    if (!box) return;
    const items = [...box.querySelectorAll(".ring-item")], n = items.length, count = app.querySelector(".ring-count");
    const real = state.album.length || n;
    const AUTO = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 0.26; // ảnh/giây
    const STEP = 55 * Math.PI / 180, R = 150;                                       // mỗi ảnh lệch 55° trên vòng, bán kính 150 đơn vị
    let pos = 0, vel = AUTO, raf = 0, last = 0, drag = null, moved = 0, visible = false, unit = box.clientWidth / 375, shown = -1;
    const st = items.map(() => ({ on: true, z: "" }));
    const wrap = d => { d %= n; if (d > n / 2) d -= n; if (d < -n / 2) d += n; return d; };

    const layout = () => {
      items.forEach((it, k) => {
        const d = wrap(k - pos), phi = d * STEP, c = Math.cos(phi), S = st[k];
        const op = Math.abs(d) >= 2 ? 0 : Math.max(0, Math.min(1, (c + 0.25) / 0.45)); // chỉ 2 ảnh mỗi bên, ảnh xa hơn nằm khuất
        if (op <= 0) { if (S.on) { S.on = false; it.style.opacity = "0"; it.style.visibility = "hidden"; } return; }
        if (!S.on) { S.on = true; it.style.visibility = ""; }
        const scale = 0.42 + 0.58 * Math.max(0, c) ** 2;
        it.style.transform = `translate3d(${(Math.sin(phi) * R * unit).toFixed(1)}px,0,0) scale(${scale.toFixed(3)}) rotateY(${(-d * 20).toFixed(1)}deg)`;
        it.style.opacity = op.toFixed(2);
        const z = String(Math.round(50 + c * 50));
        if (S.z !== z) { S.z = z; it.style.zIndex = z; }
      });
      const cur = ((Math.round(pos) % n) + n) % n;
      if (cur !== shown) {
        shown = cur;
        items.forEach((it, k) => it.classList.toggle("on", k === cur));
        if (count) count.textContent = `${(cur % real) + 1} / ${real}`;
      }
    };
    const frame = now => {
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      if (!drag) { vel += (AUTO - vel) * Math.min(1, dt * 1.6); pos += vel * dt; }
      layout();
      raf = visible ? requestAnimationFrame(frame) : 0;
    };
    const kick = () => { if (visible && !raf) { last = 0; raf = requestAnimationFrame(frame); } };

    box.addEventListener("pointerdown", e => { drag = { x: e.clientX, p: pos, px: e.clientX, t: performance.now(), v: 0 }; moved = 0; });
    box.addEventListener("pointermove", e => {
      if (!drag) return;
      const now = performance.now(), dx = e.clientX - drag.x, per = R * unit;
      moved = Math.max(moved, Math.abs(dx));
      pos = drag.p - dx / per;
      const dt = Math.max(0.008, (now - drag.t) / 1000);
      drag.v = -((e.clientX - drag.px) / per) / dt;
      drag.px = e.clientX; drag.t = now;
    });
    const end = () => {
      if (!drag) return;
      vel = performance.now() - drag.t > 120 ? 0 : Math.max(-6, Math.min(6, drag.v));
      drag = null;
    };
    box.addEventListener("pointerup", end);
    box.addEventListener("pointercancel", end);
    box.addEventListener("pointerleave", end);
    box.addEventListener("click", e => {
      const it = e.target.closest(".ring-item");
      if (!it || moved > 8) return;
      const d = wrap(items.indexOf(it) - pos), c = it.firstElementChild;
      if (Math.abs(d) < 0.5) { if (!c.classList.contains("empty")) showLb(+c.dataset.i); }
      else vel = d * 2.4; // trượt ảnh vừa chạm vào giữa
    });
    const onResize = () => { unit = box.clientWidth / 375; layout(); };
    window.addEventListener("resize", onResize);
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) kick(); });
    io.observe(box);
    ringStop = () => { cancelAnimationFrame(raf); raf = 0; visible = false; io.disconnect(); window.removeEventListener("resize", onResize); };
    layout();
  }

  /* ---------- xác nhận tham dự ---------- */
  function setupRsvp(inv, opts) {
    const btn = document.getElementById("rsvpBtn"), modal = document.getElementById("rsvp");
    if (!btn || !modal) return;
    const form = modal.querySelector("form"), msg = modal.querySelector(".rsvp-msg"), cnt = modal.querySelector(".rsvp-cnt");
    const key = "rsvp-" + (inv.id || inv.slug || "");
    const mark = () => { try { if (localStorage.getItem(key)) btn.textContent = "ĐÃ XÁC NHẬN ✓"; } catch (e) {} };
    const close = () => modal.classList.remove("open");
    mark();
    btn.onclick = () => { msg.textContent = ""; modal.classList.add("open"); };
    modal.addEventListener("click", e => { if (e.target === modal || e.target.closest(".x")) close(); });
    form.addEventListener("change", () => { cnt.hidden = form.go.value !== "yes"; });
    form.addEventListener("submit", async e => {
      e.preventDefault();
      if (opts.preview) { msg.textContent = "Đang xem trước nên chưa gửi được."; return; }
      const name = form.n.value.trim();
      if (!name) return;
      const go = form.go.value, text = form.m.value.trim();
      const send = form.querySelector("button[type=submit]");
      send.disabled = true; msg.textContent = "Đang gửi...";
      try {
        const w = await window.Store.addWish(inv.id, name, window.Store.rsvpMessage(go, +form.c.value || 1, text));
        state.wishes.unshift(w);
        renderWishes();
        try { localStorage.setItem(key, go); } catch (err) {}
        mark();
        form.reset(); cnt.hidden = false;
        msg.textContent = go === "yes" ? "Cảm ơn bạn! Hẹn gặp bạn nhé 🤍" : "Cảm ơn bạn đã báo nhé 🤍";
        setTimeout(close, 1600);
      } catch (err) {
        console.error(err);
        msg.textContent = "Gửi chưa được, bạn thử lại nhé.";
      } finally { send.disabled = false; }
    });
  }

  /* ---------- dựng trang ---------- */
  let state ={ inv: null, wishes: [], album: [], rendered: false };

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

    // các phần dùng chung cho mọi mẫu
    const placeSec = `
      <section class="sec place"><div class="sheet-fill"></div><div class="sheet top"></div><div class="sheet bottom"></div>
        <div class="place-card">
          <div ${A("card-title", "pop", 1.3)}>Địa điểm</div>
          <div ${A("venue", "pop", 1.3)}>${esc(D.venue)}</div>
          <div class="addr">${esc(D.address)}</div>
          ${mapQ ? `<div class="map"><iframe src="https://www.google.com/maps?q=${mapQ}&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Bản đồ"></iframe></div>` : ""}
        </div>
      </section>`;
    const letterSec = letter ? `
      <section class="sec letter">
        <h2 ${A("sec-title", "pop", 1.3)}>LƯU BÚT</h2>
        <div ${A("letter-body", "blur-in", 1)}>${letter}</div>
        <div ${A("sign", "blur-in", 2.3)}>${esc(D.signature || D.name)}</div>
      </section>` : "";
    const wishSec = `
      <section class="sec wish">
        <h2 ${A("sec-title", "pop", 1.3)}>${esc(D.wishTitle)}</h2>
        <form id="wishForm" autocomplete="off">
          <input name="n" maxlength="60" placeholder="Tên của bạn là?" required>
          <textarea name="m" maxlength="560" placeholder="Gửi lời chúc nha" required></textarea>
          <button class="send" type="submit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7Z"/></svg>
            GỬI NGAY
          </button>
          <div class="wish-msg" id="wishMsg"></div>
        </form>
        <div class="wish-list" id="wishList"></div>
      </section>`;
    const thanksSec = `
      <section class="sec thanks">
        ${photo(D.thanksImage)}
        <div class="inner">
          <h2 ${A("", "pop", 1.3)}>${esc(D.thanksTitle)}</h2>
          <p>${esc(D.thanksText)}</p>
        </div>
      </section>`;
    const musicBtn = `<button class="music" id="musicBtn" aria-label="Bật/tắt nhạc" hidden><i></i><i></i><i></i><i></i></button>`;

    const silk = D.theme === "silk";
    let html, countTo = 0;
    if (silk) {
      // giờ bắt đầu lấy từ ô "Giờ" (vd "17:30 - 19:30" -> 17:30)
      const tm = String(D.timeText || "").match(/(\d{1,2})\s*[:hg]\s*(\d{2})/i);
      const hhmm = tm ? `${tm[1].padStart(2, "0")}:${tm[2]}` : "";
      countTo = new Date(`${/^\d{4}-\d{2}-\d{2}$/.test(D.date) ? D.date : date.toISOString().slice(0, 10)}T${hhmm || "00:00"}:00`).getTime();
      const moments = album.length ? album : [...film, safeUrl(D.filmBig)].filter(Boolean);
      state.album = moments;
      const slots = moments.length ? moments : show ? ["", "", "", "", "", ""] : [];
      html = silkPage(D, { show, accent, logo, date, dow: dows[date.getDay()], hhmm, slots, placeSec, letterSec, wishSec, thanksSec, musicBtn });
    } else html = `
    <main class="inv${show ? " is-preview" : ""}" style="--accent:${accent}">
      <section class="sec hero silk${D.sashOn ? " has-sash" : ""}">
        ${D.sashOn ? sashHeader(D, logo) : `<div class="school">
          <div ${A("school-logo" + (logo ? " has-img" : ""), "fade-in-down", 2)}>${logo ? `<img src="${esc(logo)}" alt="">` : esc((D.schoolEn || D.schoolVi || "U").trim().charAt(0))}</div>
          <div ${A("school-name", "fade-in-down", 3)}><b>${esc(D.schoolVi)}</b><span>${esc(D.schoolEn)}</span></div>
        </div>
        <div class="grad-title">
          <div ${A("big", "fade-in-left", 1.5)}>${esc(D.titleBig)}</div>
          <div ${A("script", "fade-in-right", 1.5)}>${esc(D.titleScript)}</div>
        </div>`}
        ${photo(D.hero, "hero-photo", "", D.sashOn ? "" : `<div ${A("name", "blur-in", 1)}>${esc(D.name)}</div>`)}
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

      ${placeSec}
      ${letterSec}

      ${albumHtml ? `
      <section class="sec album"><div class="sheet-fill"></div><div class="sheet top"></div><div class="sheet bottom"></div>
        <div ${A("album-title", "pop", 1.3)}>${esc(D.albumTitle)}</div>
        <div class="album-grid">${albumHtml}</div>
      </section>` : ""}

      ${wishSec}
      ${thanksSec}
    </main>
    ${musicBtn}`;

    const y = window.scrollY;
    app.innerHTML = html;
    document.title = `${D.name} - Thiệp Mời Tốt Nghiệp`;
    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.style.setProperty("--ink", shade(accent, -0.3));
    document.documentElement.style.setProperty("--soft", shade(accent, 0.22));
    setupAnimations(state.rendered);
    if (silk || D.sashOn) { startSash(D, accent, silk); fitSxName(); if (document.fonts) document.fonts.ready.then(fitSxName); } else stopSash();
    setupAlbum();
    setupCountdown(silk ? countTo : 0);
    setupRing();
    setupRsvp(inv, opts);
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
    app.classList.toggle("instant", !!instant); // xem trước trong CMS: không chạy lại hiệu ứng mở đầu
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
    // xác nhận tham dự không kèm lời nhắn thì không hiện ở đây (chủ thiệp xem trong trang quản lý)
    const list = state.wishes.map(w => ({ w, r: window.Store.parseRsvp(w.message) })).filter(x => !x.r || x.r.text);
    box.innerHTML = list.length
      ? list.map(({ w, r }) => `<div class="wish-item"><b>${esc(w.name)}</b>${r ? `<span class="rsvp-tag ${r.go}">${r.go === "yes" ? "Sẽ tham dự" : "Không đến được"}</span>` : ""}<p>${esc(r ? r.text : w.message)}</p><time>${fmt(w.created_at)}</time></div>`).join("")
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
